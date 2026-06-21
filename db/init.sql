-- Consolidated Docker init: final schema after all migrations.
-- Production systems apply db/migrations/ incrementally.
-- This file brings a fresh Postgres instance to the current state in one shot.

CREATE TABLE IF NOT EXISTS runs (
    id              UUID PRIMARY KEY,
    parent_id       UUID,
    session_id      UUID,
    project         TEXT NOT NULL,
    name            TEXT NOT NULL,
    run_type        TEXT NOT NULL,
    inputs          JSONB,
    outputs         JSONB,
    error           TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    latency_ms      INT GENERATED ALWAYS AS
                    (CAST(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 AS INT)) STORED,
    tags            TEXT[],
    extra           JSONB,
    branch_decision TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_project_time      ON runs (project, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_runs_session           ON runs (session_id);
CREATE INDEX IF NOT EXISTS idx_runs_parent            ON runs (parent_id);
CREATE INDEX IF NOT EXISTS idx_runs_chain_session     ON runs (project, run_type, session_id, start_time)
    WHERE run_type = 'chain';
CREATE INDEX IF NOT EXISTS idx_runs_project_name_time ON runs (project, name, start_time DESC);

-- user_id column present but no FK: better-auth auto-creates the "user" table
-- on first dashboard startup, after this init script has already run.
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id     TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
