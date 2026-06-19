CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_project_name_time
    ON runs (project, name, start_time DESC);
