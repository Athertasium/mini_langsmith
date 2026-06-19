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
    "branch_decision",
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
        span.get("branch_decision"),
    )


async def _insert_batch(spans: list[dict[str, Any]]) -> None:
    # _start and _end for the same run_id can land in the same batch.
    # Postgres rejects double-upsert on the same conflict key within one statement.
    # Merge: keep name/inputs/session_id/tags from first (start), overlay
    # outputs/end_time/error/extra/branch_decision from last (end).
    deduped: dict[str, dict[str, Any]] = {}
    for span in spans:
        sid = span["id"]
        if sid in deduped:
            prev = deduped[sid]
            merged = {**prev}
            for field in ("outputs", "end_time", "error", "extra", "branch_decision"):
                if span.get(field) is not None:
                    merged[field] = span[field]
            deduped[sid] = merged
        else:
            deduped[sid] = span
    # Topological sort: parents must be inserted before children.
    # Spans whose parent_id is not in this batch are already in DB — treat as satisfied.
    batch_ids = {s["id"] for s in deduped.values()}
    ordered: list[dict[str, Any]] = []
    remaining = list(deduped.values())
    inserted_ids: set[str] = set()
    max_passes = len(remaining) + 1
    passes = 0
    while remaining and passes < max_passes:
        passes += 1
        next_remaining = []
        for span in remaining:
            pid = span.get("parent_id")
            if pid is None or pid not in batch_ids or pid in inserted_ids:
                ordered.append(span)
                inserted_ids.add(span["id"])
            else:
                next_remaining.append(span)
        remaining = next_remaining
    ordered.extend(remaining)  # cycles/unresolved — insert anyway, may still fail FK
    spans = ordered

    pool = await get_pool()
    col_list = ", ".join(INSERT_COLS)
    args: list[Any] = []
    value_groups: list[str] = []
    for i, span in enumerate(spans):
        row = _row(span)
        args.extend(row)
        group = "(" + ", ".join(f"${i * len(INSERT_COLS) + j + 1}" for j in range(len(INSERT_COLS))) + ")"
        value_groups.append(group)

    update_cols = ("outputs", "error", "end_time", "extra", "branch_decision")
    update_clause = ", ".join(
        f"{c} = COALESCE(EXCLUDED.{c}, runs.{c})" for c in update_cols
    )
    sql = (
        f"INSERT INTO runs ({col_list}) VALUES {', '.join(value_groups)} "
        f"ON CONFLICT (id) DO UPDATE SET {update_clause}"
    )

    async with pool.acquire() as conn:
        try:
            await conn.execute(sql, *args)
        except Exception as batch_err:
            log.warning("Batch insert failed (%s) — retrying spans individually", batch_err)
            for span in spans:
                single_row = _row(span)
                single_group = "(" + ", ".join(f"${j + 1}" for j in range(len(INSERT_COLS))) + ")"
                single_sql = (
                    f"INSERT INTO runs ({col_list}) VALUES {single_group} "
                    f"ON CONFLICT (id) DO UPDATE SET {update_clause}"
                )
                try:
                    await conn.execute(single_sql, *single_row)
                except Exception as span_err:
                    log.warning("Dead-lettering span %s — %s", span.get("id"), span_err)
                    await deadletter_spans([span], error=str(span_err))


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
                except Exception as batch_err:
                    log.exception("Batch insert failed — dead-lettering %d spans", len(spans))
                    await deadletter_spans(spans, error=str(batch_err))
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
