from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class SpanIn(BaseModel):
    id: UUID
    parent_id: UUID | None = None
    session_id: UUID | None = None
    project: str
    name: str
    run_type: Literal["llm", "chain", "tool", "retriever"]
    inputs: dict[str, Any] | None = None
    outputs: dict[str, Any] | None = None
    error: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    tags: list[str] = Field(default_factory=list)
    extra: dict[str, Any] | None = None
