---
allowed-tools: Bash(psql :* ), Bash(node :* ), Read
description:PostgreSQL の接続確認と todos テーブルの状態チェックを行う
---

## DB 接続確認

以下を順番に確認してください:
1. .env ファイルに DB_HOST /DB_PORT / DB_NAME / DB_USER /DB_PASSWORD が設定されているか
2. psqL コマンドで接続できるか確認するスクリプトを実行する
3. todos テーブルが存在してレコード数を返すか確認する
4. .env が.gitignore に含まれているか確認する

問題があれば修正方法を提示してください。