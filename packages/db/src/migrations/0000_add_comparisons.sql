CREATE TABLE IF NOT EXISTS github_users (
  id serial PRIMARY KEY,
  username varchar(255) NOT NULL UNIQUE,
  avatar_url text,
  name text,
  bio text,
  public_repos integer,
  followers integer,
  following integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  raw_data jsonb
);

CREATE TABLE IF NOT EXISTS telegram_channels (
  id serial PRIMARY KEY,
  telegram_id varchar(255) NOT NULL UNIQUE,
  username varchar(255),
  title text,
  about text,
  participants_count integer,
  verified boolean DEFAULT false,
  broadcast boolean DEFAULT false,
  megagroup boolean DEFAULT false,
  post_count integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comparisons (
  id serial PRIMARY KEY,
  github_user_id integer REFERENCES github_users(id),
  telegram_channel_id integer REFERENCES telegram_channels(id),
  type varchar(32),
  "left" jsonb,
  "right" jsonb,
  left_score integer,
  right_score integer,
  winner varchar(16),
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS comparisons
  ADD COLUMN IF NOT EXISTS type varchar(32),
  ADD COLUMN IF NOT EXISTS "left" jsonb,
  ADD COLUMN IF NOT EXISTS "right" jsonb,
  ADD COLUMN IF NOT EXISTS left_score integer,
  ADD COLUMN IF NOT EXISTS right_score integer,
  ADD COLUMN IF NOT EXISTS winner varchar(16);
