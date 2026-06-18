import os

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status

from collector.models import SpanIn
from collector.redis_queue import enqueue_span

load_dotenv()

app = FastAPI(title="Tracer Collector")


def _check_api_key(x_api_key: str | None) -> None:
    expected = os.environ.get("TRACER_API_KEY", "")
    if not expected or x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
        )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/runs", status_code=status.HTTP_202_ACCEPTED)
async def ingest_span(
    span: SpanIn,
    x_api_key: str | None = Header(default=None),
) -> dict[str, str]:
    _check_api_key(x_api_key)
    await enqueue_span(span.model_dump())
    return {"accepted": str(span.id)}
