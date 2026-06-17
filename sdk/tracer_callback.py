"""
Drop-in LangChain callback handler. Sends spans to Tracer collector.

Usage:
    from sdk.tracer_callback import CustomTracer
    tracer = CustomTracer(endpoint="http://localhost:8000", project="doclens", api_key="...")
    chain.invoke(input, config={"callbacks": [tracer]})
"""

import asyncio
import logging
import threading
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.outputs import LLMResult

log = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


class CustomTracer(BaseCallbackHandler):
    def __init__(self, endpoint: str, project: str, api_key: str) -> None:
        super().__init__()
        self._endpoint = endpoint.rstrip("/")
        self._project = project
        self._api_key = api_key
        self._start_times: dict[str, datetime] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _key(self, run_id: UUID) -> str:
        return str(run_id)

    def _record_start(self, run_id: UUID) -> datetime:
        t = _now()
        self._start_times[self._key(run_id)] = t
        return t

    def _pop_start(self, run_id: UUID) -> datetime | None:
        return self._start_times.pop(self._key(run_id), None)

    def _fire(self, payload: dict[str, Any]) -> None:
        """Fire-and-forget POST — never blocks calling thread."""
        payload.setdefault("project", self._project)

        def _send() -> None:
            try:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.post(
                        f"{self._endpoint}/runs",
                        json=payload,
                        headers={"X-API-Key": self._api_key},
                    )
                    if resp.status_code not in (200, 202):
                        log.warning("Tracer ingest %s: %s", resp.status_code, resp.text)
            except Exception:
                log.exception("Tracer POST failed — span dropped")

        threading.Thread(target=_send, daemon=True).start()

    # ------------------------------------------------------------------
    # LLM
    # ------------------------------------------------------------------

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._record_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": serialized.get("id", ["unknown"])[-1],
            "run_type": "llm",
            "inputs": {"prompts": prompts},
            "start_time": _iso(start),
            "tags": tags or [],
        })

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        llm_output = response.llm_output or {}
        token_usage = llm_output.get("token_usage", {})
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "llm",
            "run_type": "llm",
            "inputs": None,
            "outputs": {"generations": [[g.text for g in gen] for gen in response.generations]},
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
            "extra": {
                "model_name": llm_output.get("model_name"),
                "prompt_tokens": token_usage.get("prompt_tokens"),
                "completion_tokens": token_usage.get("completion_tokens"),
                "total_tokens": token_usage.get("total_tokens"),
            },
        })

    def on_llm_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "llm",
            "run_type": "llm",
            "error": str(error),
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })

    # ------------------------------------------------------------------
    # Chain
    # ------------------------------------------------------------------

    def on_chain_start(
        self,
        serialized: dict[str, Any],
        inputs: dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._record_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": serialized.get("id", ["chain"])[-1],
            "run_type": "chain",
            "inputs": inputs,
            "start_time": _iso(start),
            "tags": tags or [],
        })

    def on_chain_end(
        self,
        outputs: dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "chain",
            "run_type": "chain",
            "outputs": outputs,
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })

    def on_chain_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "chain",
            "run_type": "chain",
            "error": str(error),
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })

    # ------------------------------------------------------------------
    # Tool
    # ------------------------------------------------------------------

    def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._record_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": serialized.get("name", "tool"),
            "run_type": "tool",
            "inputs": {"input": input_str},
            "start_time": _iso(start),
            "tags": tags or [],
        })

    def on_tool_end(
        self,
        output: Any,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "tool",
            "run_type": "tool",
            "outputs": {"output": str(output)},
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })

    def on_tool_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "tool",
            "run_type": "tool",
            "error": str(error),
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })

    # ------------------------------------------------------------------
    # Retriever
    # ------------------------------------------------------------------

    def on_retriever_start(
        self,
        serialized: dict[str, Any],
        query: str,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._record_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": serialized.get("id", ["retriever"])[-1],
            "run_type": "retriever",
            "inputs": {"query": query},
            "start_time": _iso(start),
            "tags": tags or [],
        })

    def on_retriever_end(
        self,
        documents: Any,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "retriever",
            "run_type": "retriever",
            "outputs": {"documents": [str(d) for d in documents]},
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })

    def on_retriever_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": None,
            "name": "retriever",
            "run_type": "retriever",
            "error": str(error),
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })
