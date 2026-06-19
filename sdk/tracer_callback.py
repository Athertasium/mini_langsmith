"""
Drop-in LangChain callback handler. Sends spans to Tracer collector.

Usage:
    from sdk.tracer_callback import CustomTracer
    tracer = CustomTracer(endpoint="http://localhost:8000", project="doclens", api_key="...")
    chain.invoke(input, config={"callbacks": [tracer]})
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.outputs import LLMResult

log = logging.getLogger(__name__)


def _safe_json(obj: Any) -> Any:
    """Recursively convert non-JSON-serializable objects to safe types."""
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, dict):
        return {k: _safe_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_safe_json(v) for v in obj]
    # Pydantic v2
    if hasattr(obj, "model_dump"):
        return _safe_json(obj.model_dump())
    # Pydantic v1
    if hasattr(obj, "dict"):
        return _safe_json(obj.dict())
    # dataclasses
    try:
        import dataclasses
        if dataclasses.is_dataclass(obj):
            return _safe_json(dataclasses.asdict(obj))
    except Exception:
        pass
    # last resort
    try:
        json.dumps(obj)
        return obj
    except TypeError:
        return str(obj)


# Per-1M-token pricing (input_usd, output_usd)
_PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o":                       (2.50,  10.00),
    "gpt-4o-mini":                  (0.15,   0.60),
    "gpt-4-turbo":                  (10.00, 30.00),
    "gpt-4":                        (30.00, 60.00),
    "gpt-3.5-turbo":                (0.50,   1.50),
    "claude-3-5-sonnet":            (3.00,  15.00),
    "claude-3-5-haiku":             (0.80,   4.00),
    "claude-3-opus":                (15.00, 75.00),
    "claude-3-haiku":               (0.25,   1.25),
    "claude-sonnet-4":              (3.00,  15.00),
    "claude-haiku-4-5-20251001":    (1.00,   5.00),
    "llama3-8b-8192":               (0.05,   0.08),
    "llama3-70b-8192":              (0.59,   0.79),
    "llama-3.1-8b-instant":         (0.05,   0.08),
    "llama-3.3-70b-versatile":      (0.59,   0.79),
    "mixtral-8x7b-32768":           (0.24,   0.24),
    "gemma-7b-it":                  (0.07,   0.07),
}


def _compute_cost(
    model: str | None,
    prompt_tokens: int | None,
    completion_tokens: int | None,
) -> float | None:
    if not model or prompt_tokens is None or completion_tokens is None:
        return None
    key = model.lower()
    for name, (inp, out) in _PRICING.items():
        if name in key or key.startswith(name):
            return (prompt_tokens * inp + completion_tokens * out) / 1_000_000
    return None


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


class CustomTracer(BaseCallbackHandler):
    def __init__(
        self,
        endpoint: str,
        api_key: str,
        project: str | None = None,
        router_decision_key: str = "routerDecision",
    ) -> None:
        super().__init__()
        resolved = project or os.environ.get("TRACER_NAME") or os.environ.get("PROJECT")
        if not resolved:
            raise ValueError(
                "project name required: pass project= or set TRACER_NAME env var"
            )
        self._endpoint = endpoint.rstrip("/")
        self._project = resolved
        self._api_key = api_key
        self._router_decision_key = router_decision_key
        self._start_times: dict[str, datetime] = {}
        self._sessions: dict[str, str] = {}
        self._names: dict[str, str] = {}

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

    def _get_session(self, run_id: UUID, parent_run_id: UUID | None) -> str:
        key = self._key(run_id)
        if parent_run_id is None:
            session = str(run_id)
        else:
            session = self._sessions.get(self._key(parent_run_id), str(run_id))
        self._sessions[key] = session
        return session

    def _lookup_session(self, run_id: UUID) -> str | None:
        return self._sessions.get(self._key(run_id))

    def _fire(self, payload: dict[str, Any]) -> None:
        """Fire-and-forget POST — never blocks calling thread."""
        payload.setdefault("project", self._project)
        safe_payload = _safe_json(payload)

        def _send() -> None:
            try:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.post(
                        f"{self._endpoint}/runs",
                        json=safe_payload,
                        headers={"X-API-Key": self._api_key},
                    )
                    if resp.status_code not in (200, 202):
                        log.warning("Tracer ingest %s: %s", resp.status_code, resp.text)
            except Exception:
                log.exception("Tracer POST failed — span dropped")

        threading.Thread(target=_send, daemon=True).start()

    # ------------------------------------------------------------------
    # LLM  (text LLMs → on_llm_start; chat models → on_chat_model_start)
    # ------------------------------------------------------------------

    def on_chat_model_start(
        self,
        serialized: dict[str, Any],
        messages: list[list[Any]],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        name: str | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._record_start(run_id)
        llm_name = (
            name
            or (serialized or {}).get("name")
            or (serialized or {}).get("id", ["unknown"])[-1]
        )
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": self._get_session(run_id, parent_run_id),
            "name": llm_name,
            "run_type": "llm",
            "inputs": {"messages": [[str(m) for m in ms] for ms in messages]},
            "start_time": _iso(start),
            "tags": tags or [],
        })

    def on_llm_start(
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        name: str | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._record_start(run_id)
        llm_name = (
            name
            or (serialized or {}).get("name")
            or (serialized or {}).get("id", ["unknown"])[-1]
        )
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": self._get_session(run_id, parent_run_id),
            "name": llm_name,
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
        # OpenAI/Groq: token_usage / model_name
        # Anthropic:   usage (input_tokens/output_tokens) / model
        token_usage = llm_output.get("token_usage") or llm_output.get("usage") or {}
        model_name = llm_output.get("model_name") or llm_output.get("model")
        prompt_tokens = token_usage.get("prompt_tokens") or token_usage.get("input_tokens")
        completion_tokens = token_usage.get("completion_tokens") or token_usage.get("output_tokens")
        total_tokens = token_usage.get("total_tokens") or (
            (prompt_tokens or 0) + (completion_tokens or 0) if prompt_tokens or completion_tokens else None
        )
        extra: dict[str, Any] = {
            "model_name": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }
        cost = _compute_cost(model_name, prompt_tokens, completion_tokens)
        if cost is not None:
            extra["cost_usd"] = cost
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": self._lookup_session(run_id),
            "name": "llm",
            "run_type": "llm",
            "inputs": None,
            "outputs": {"generations": [[g.text for g in gen] for gen in response.generations]},
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
            "extra": extra,
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
            "session_id": self._lookup_session(run_id),
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
        name: str | None = None,
        **kwargs: Any,
    ) -> None:
        node_name = (
            name
            or (serialized or {}).get("name")
            or (serialized or {}).get("id", ["chain"])[-1]
        )
        self._names[self._key(run_id)] = node_name
        start = self._record_start(run_id)
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": self._get_session(run_id, parent_run_id),
            "name": node_name,
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
        name = self._names.pop(self._key(run_id), "chain")
        branch_decision: str | None = None
        if isinstance(outputs, dict):
            val = outputs.get(self._router_decision_key)
            if val is not None:
                branch_decision = str(val)
        payload: dict[str, Any] = {
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": self._lookup_session(run_id),
            "name": name,
            "run_type": "chain",
            "outputs": outputs,
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        }
        if branch_decision is not None:
            payload["branch_decision"] = branch_decision
        self._fire(payload)

    def on_chain_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        parent_run_id: UUID | None = None,
        **kwargs: Any,
    ) -> None:
        start = self._pop_start(run_id)
        name = self._names.pop(self._key(run_id), "chain")
        self._fire({
            "id": str(run_id),
            "parent_id": str(parent_run_id) if parent_run_id else None,
            "session_id": self._lookup_session(run_id),
            "name": name,
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
            "session_id": self._get_session(run_id, parent_run_id),
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
            "session_id": self._lookup_session(run_id),
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
            "session_id": self._lookup_session(run_id),
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
            "session_id": self._get_session(run_id, parent_run_id),
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
            "session_id": self._lookup_session(run_id),
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
            "session_id": self._lookup_session(run_id),
            "name": "retriever",
            "run_type": "retriever",
            "error": str(error),
            "start_time": _iso(start) if start else _iso(_now()),
            "end_time": _iso(_now()),
        })
