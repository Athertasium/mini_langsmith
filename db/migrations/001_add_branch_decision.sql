-- Migration 001: add branch_decision column for routing-path visualization
-- Apply: psql $DATABASE_URL -f db/migrations/001_add_branch_decision.sql

ALTER TABLE runs ADD COLUMN IF NOT EXISTS branch_decision TEXT;

-- index accelerates the path-frequency query's filter on project + run_type
CREATE INDEX IF NOT EXISTS idx_runs_chain_session
  ON runs (project, run_type, session_id, start_time)
  WHERE run_type = 'chain';
