CREATE TABLE IF NOT EXISTS telegram_sessions (
  id serial PRIMARY KEY,
  device_id varchar(255) NOT NULL UNIQUE,
  session text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
