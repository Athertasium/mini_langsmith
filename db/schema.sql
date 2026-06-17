CREATE TABLE IF NOT EXISTS runs (
    id          UUID PRIMARY KEY,
    parent_id   UUID REFERENCES runs(id),
    session_id  UUID,
    project     TEXT NOT NULL,
    name        TEXT NOT NULL,
    run_type    TEXT NOT NULL,
    inputs      JSONB,
    outputs     JSONB,
    error       TEXT,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ,
    latency_ms  INT GENERATED ALWAYS AS
                (CAST(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 AS INT)) STORED,
    tags        TEXT[],
    extra       JSONB
);

CREATE INDEX IF NOT EXISTS idx_runs_project_time ON runs (project, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_runs_session      ON runs (session_id);
CREATE INDEX IF NOT EXISTS idx_runs_parent       ON runs (parent_id);
