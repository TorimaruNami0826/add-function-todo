-- todos テーブルの初期化
-- psql -U <user> -d <dbname> -f src/db/init.sql で実行する

CREATE TABLE IF NOT EXISTS todos (
  id         BIGSERIAL   PRIMARY KEY,
  title      TEXT        NOT NULL,
  completed  BOOLEAN     NOT NULL DEFAULT false,
  priority   INTEGER     NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
