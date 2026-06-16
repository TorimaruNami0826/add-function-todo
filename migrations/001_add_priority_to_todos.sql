-- todos テーブルに priority カラムを追加する
-- 既存レコードのデフォルト値は 2（通常）とする
-- 実行: psql -U <user> -d <dbname> -f migrations/001_add_priority_to_todos.sql

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 2;
