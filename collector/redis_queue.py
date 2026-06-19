import json
import os
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis

PENDING_KEY = "runs:pending"
DEADLETTER_KEY = "runs:deadletter"

_client: aioredis.Redis | None = None  # type: ignore[type-arg]


def _get_client() -> aioredis.Redis:  # type: ignore[type-arg]
    global _client
    if _client is None:
        _client = aioredis.from_url(
            os.environ["REDIS_URL"],
            decode_responses=True,
        )
    return _client


async def enqueue_span(payload: dict[str, Any]) -> None:
    client = _get_client()
    await client.rpush(PENDING_KEY, json.dumps(payload, default=str))


async def dequeue_batch(n: int = 50) -> list[dict[str, Any]]:
    client = _get_client()
    raw = await client.lpop(PENDING_KEY, n)
    if not raw:
        return []
    return [json.loads(item) for item in raw]


async def deadletter_spans(payloads: list[dict[str, Any]], error: str | None = None) -> None:
    client = _get_client()
    failed_at = datetime.now(timezone.utc).isoformat()
    for payload in payloads:
        entry = {"payload": payload, "error": error, "failed_at": failed_at}
        await client.rpush(DEADLETTER_KEY, json.dumps(entry, default=str))
