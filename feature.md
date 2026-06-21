# FEATURE.md — Tracer v3 Polish Features

> Read CLAUDE.md first. This file assumes full context on the project,
> stack, data model, and v1/v1.5/v2 scope already shipped. Do not start
> any feature below until CLAUDE.md is read in full.

---

## Scope

Three additions to the existing Trace Detail / Trace List experience, plus
one operational tool. Deepening existing pages, not adding new top-level
surfaces (except the DLQ inspector, which is a new admin-only page). No
eval scoring, no new frameworks, no new top-level nav items beyond what's
listed here.

---

## 1. Dead Letter Queue (DLQ) Inspector

**Why:** CLAUDE.md §6.2 already states failed inserts land in
`runs:deadletter` instead of being silently dropped. This feature makes
that architectural detail tangible and operable instead of theoretical.

**Build:**
- New page: `/admin/dlq`.
- Lists the most recent N (e.g. 10–20) failed spans from `runs:deadletter`.
- Each row shows: raw JSON payload, the Postgres error message, failure
  timestamp.
- "Replay" button: pushes the payload back onto `runs:pending` unmodified.

**Key decision to document (not yet resolved — decide during build):**
Replay assumes the failure was transient (e.g. DB connection blip during
batch write), not a payload defect (e.g. missing `NOT NULL` field, bad
JSONB shape). If the payload itself was malformed, replay will fail
identically. Decide whether:
- (a) Replay is unmodified retry only, and malformed payloads are expected
  to fail again visibly (simplest, and defensible if documented), or
- (b) The inspector allows editing the payload JSON before replay.

Whichever is chosen, write the reasoning into CLAUDE.md's Key Decisions
Log — this is a sharp, specific interview answer either way, but only if
it's stated as a deliberate choice rather than discovered as a gap later.

**Out of scope:** CLI version of this tool. One interface (the dashboard
page) is enough at portfolio scale; a second interface is maintenance
overhead without payoff.

---

## 2. Span-Level Latency Sparklines

**Why:** Answers "is this 2-second retrieval an outlier?" inline, without
leaving the trace view. This is the most direct demonstration that
observability is about context, not just data display.

**Build:**
- In `TraceTree.tsx`, render a small (~100px wide) Recharts sparkline next
  to each span's name.
- Sparkline shows latency distribution for that specific `name` over its
  last ~50 runs.
- Query: `WHERE project = $1 AND name = $2 ORDER BY start_time DESC LIMIT 50`.
  Scope is per-project, not global — the same span name (e.g. `ChatGroq`)
  appears in both DocLens and EchoNote, and mixing their latency
  distributions produces a meaningless baseline.

**Supporting infra change:**
- Add a composite index `(project, name, start_time)` rather than relying
  solely on the existing `idx_runs_project_time`. Add as a new migration
  file following the existing numbering convention.

**Empty/loading state (required, not optional):**
- If fewer than ~5 historical runs exist for that `name` within the
  project, do not render a flat/misleading sparkline. Show a small
  "not enough history yet" indicator instead. Threshold is a judgment
  call — 5 is a reasonable default, adjust if it looks wrong in practice.

---

## 3. Rich Output Rendering

**Why:** Plain-text dumps of LLM outputs and raw JSON blobs are the
clearest "student project" tell. Rendering them properly is the cheapest
available signal of product-level UX attention.

**Build:**
- For `run_type = 'llm'` spans: render the `outputs` field with
  `react-markdown` (LLM outputs are typically markdown — headers, code
  blocks, lists should render as such, not as raw text).
- For `inputs` and `extra` (and any other JSONB field shown in the tree):
  render with a collapsible, syntax-highlighted JSON viewer
  (`react-json-view-lite` or equivalent).
- For spans with `error IS NOT NULL`: do **not** route the error through
  the generic JSON viewer. Render it as its own monospace, non-collapsed
  block. Stack traces and error strings need to be immediately readable,
  not nested behind a collapse toggle.

---

## Build Order

1. Composite index migration (small, unblocks sparklines).
2. Sparklines (depends on index).
3. Rich output rendering (independent, can be built in parallel with 1–2).
4. DLQ inspector (independent, can be built any time).

## Definition of Done (all four features)

- [x] DLQ inspector lists failed spans with payload + Postgres error + replay action
- [x] Replay semantics (transient-only vs. editable payload) decided and documented in CLAUDE.md Key Decisions Log
- [x] Composite `(project, name, start_time)` index added via new migration file
- [x] Sparklines render per-span-name, per-project, last 50 runs, in `TraceTree.tsx`
- [x] Sparkline empty state (< 5 runs) implemented, not just assumed fine
- [x] LLM outputs render via `react-markdown`
- [x] Inputs/extra JSONB fields render via collapsible JSON viewer
- [x] Error spans render in a dedicated monospace block, not the JSON viewer
- [x] Every new architectural decision above added to CLAUDE.md §9 Key Decisions Log