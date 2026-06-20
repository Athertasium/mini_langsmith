ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
