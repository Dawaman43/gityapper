ALTER TABLE IF EXISTS github_users
  ADD COLUMN IF NOT EXISTS commits_count integer;
