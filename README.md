# Tracer

A self-built LLM observability platform — a "mini LangSmith." Ingests structured trace data (spans) from LangChain/LangGraph applications, stores them with parent-child relationships intact, and renders them in a dashboard for debugging and inspection.

```
┌──────────────────────────────────────────────────────────┐
│  LangChain App                                           │
│  CustomTracer callback → POST /runs → Redis → Worker    │
│                                          ↓               │
│                                     PostgreSQL           │
│                                          ↓               │
│                                  Next.js Dashboard       │
└──────────────────────────────────────────────────────────┘
```

**Stack:** FastAPI · Redis · arq · PostgreSQL · Next.js 14 · ReactFlow · Recharts

---

## Features

- **Async ingestion** — collector returns 202 immediately; Redis buffers writes so traced apps never block on DB latency
- **Trace tree** — recursive CTE reconstructs full parent-child span hierarchy from any root span
- **Routing path graph** — ReactFlow + dagre visualizes `branch_decision` flow across sessions with cycle detection
- **Cost analytics** — per-session and per-node cost breakdowns from token usage stored in spans
- **Span sparklines** — per-span-name latency history (last 50 runs) inline in the trace tree
- **DLQ inspector** — failed spans land in a dead-letter Redis list with a replay action
- **Drop-in SDK** — Python and TypeScript `CustomTracer(BaseCallbackHandler)` — wire to any LangChain chain with one line

---

## Quick start (Docker Compose)

**Requirements:** Docker Desktop

```bash
git clone https://github.com/Athertasium/mini_langsmith.git
cd tracer

# Copy and configure environment
cp .env.example .env
# Edit .env — set TRACER_API_KEY and BETTER_AUTH_SECRET at minimum

# Start everything
docker compose up --build
```

Services:

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| Collector API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Manual setup

**Requirements:** Python 3.11+, Node.js 18+, PostgreSQL, Redis

### 1. Backend (collector + worker)

```bash
# Install dependencies
uv sync   # or: pip install -r requirements.txt

# Copy and fill environment
cp .env.example .env

# Apply schema
psql $DATABASE_URL -f db/init.sql

# Start collector
uvicorn collector.main:app --host 0.0.0.0 --port 8000 --reload

# Start worker (separate terminal)
python -m collector.worker
```

### 2. Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard runs at http://localhost:3000.

---

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `TRACER_API_KEY` | Yes | Static API key checked on every ingest request |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `BETTER_AUTH_SECRET` | Yes | Random hex secret for dashboard auth (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Yes | Public URL the dashboard is served at |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `TRACER_NAME` | No | Default project name used by SDK when `project=` not passed explicitly |
| `ARQ_MAX_JOBS` | No | Worker concurrency (default 10) |

Docker Compose overrides `DATABASE_URL` and `REDIS_URL` automatically with the correct in-network addresses.

---

## SDK usage

### Python

Drop `sdk/tracer_callback.py` into your LangChain project:

```python
from sdk.tracer_callback import CustomTracer

tracer = CustomTracer(
    endpoint="http://localhost:8000",
    api_key="your-tracer-api-key",
    project="my-project",          # or set TRACER_NAME in .env
)

# Pass to any LangChain chain
result = chain.invoke(input, config={"callbacks": [tracer]})
```

### TypeScript

Drop `sdk/tracer_callback.ts` into your LangChain/LangGraph project:

```typescript
import { CustomTracer } from "./tracer_callback";

const tracer = new CustomTracer({
  endpoint: "http://localhost:8000",
  apiKey: "your-tracer-api-key",
  project: "my-project",
});

// Pass to any LangChain chain
const result = await chain.invoke(input, { callbacks: [tracer] });
```

The SDK implements all LangChain callback hooks (`on_llm_start`, `on_chat_model_start`, `on_chain_start`, `on_tool_start`, `on_retriever_start`, and their `_end`/`_error` variants). Every span is sent fire-and-forget — traced app latency is unaffected.

---

## Project structure

```
tracer/
├── collector/          # FastAPI ingest service + arq worker
│   ├── main.py         # POST /runs endpoint
│   ├── models.py       # Pydantic span schemas
│   ├── queue.py        # Redis enqueue logic
│   └── worker.py       # Drains queue, batch-writes to Postgres
├── db/
│   ├── init.sql        # Full schema + migrations combined
│   └── migrations/     # Incremental SQL migration files
├── sdk/
│   ├── tracer_callback.py   # Python SDK
│   └── tracer_callback.ts   # TypeScript SDK
├── dashboard/          # Next.js 14 app
│   ├── app/            # App router pages and API routes
│   └── components/     # TraceTree, FlowGraph, charts, etc.
├── docker-compose.yml
├── .env.example
└── requirements.txt
```

---

## Database schema

All spans are stored in a single self-referencing `runs` table. Parent-child relationships are a `parent_id` column — a recursive CTE reconstructs any full trace tree from a root span ID.

```sql
SELECT * FROM runs WHERE id = '<root-span-id>';
-- then: WITH RECURSIVE trace AS (...) to fetch the full tree
```

See `db/init.sql` for the full schema.
