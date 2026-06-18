import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Any

from dotenv import load_dotenv

from collector.redis_queue import DEADLETTER_KEY, PENDING_KEY, deadletter_spans, dequeue_batch
from db.connection import close_pool, get_pool

load_dotenv()

log = logging.getLogger(__name__)

BATCH_SIZE = 50
POLL_INTERVAL = 2.0

INSERT_COLS = (
    "id",
    "parent_id",
    "session_id",
    "project",
    "name",
    "run_type",
    "inputs",
    "outputs",
    "error",
    "start_time",
    "end_time",
    "tags",
    "extra",
)


def _row(span: dict[str, Any]) -> tuple[Any, ...]:
    return (
        span.get("id"),
        span.get("parent_id"),
        span.get("session_id"),
        span.get("project"),
        span.get("name"),
        span.get("run_type"),
        json.dumps(span["inputs"]) if span.get("inputs") is not None else None,
        json.dumps(span["outputs"]) if span.get("outputs") is not None else None,
        span.get("error"),
        datetime.fromisoformat(span["start_time"]) if span.get("start_time") else None,
        datetime.fromisoformat(span["end_time"]) if span.get("end_time") else None,
        span.get("tags") or [],
        json.dumps(span["extra"]) if span.get("extra") is not None else None,
    )


async def _insert_batch(spans: list[dict[str, Any]]) -> None:
    pool = await get_pool()
    col_list = ", ".join(INSERT_COLS)
    args: list[Any] = []
    value_groups: list[str] = []
    for i, span in enumerate(spans):
        row = _row(span)
        args.extend(row)
        group = "(" + ", ".join(f"${i * len(INSERT_COLS) + j + 1}" for j in range(len(INSERT_COLS))) + ")"
        value_groups.append(group)

    sql = f"INSERT INTO runs ({col_list}) VALUES {', '.join(value_groups)} ON CONFLICT (id) DO NOTHING"

    async with pool.acquire() as conn:
        await conn.execute(sql, *args)


async def drain_loop() -> None:
    log.info("Worker started — polling %s every %.1fs", PENDING_KEY, POLL_INTERVAL)
    while True:
        try:
            spans = await dequeue_batch(BATCH_SIZE)
            if spans:
                log.info("Processing batch of %d spans", len(spans))
                try:
                    await _insert_batch(spans)
                    log.info("Inserted %d spans", len(spans))
                except Exception:
                    log.exception("Batch insert failed — dead-lettering %d spans", len(spans))
                    await deadletter_spans(spans)
        except Exception:
            log.exception("Unexpected error in drain loop")
        await asyncio.sleep(POLL_INTERVAL)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        await drain_loop()
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
