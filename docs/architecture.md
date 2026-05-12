# アーキテクチャドキュメント

## 1. システム概要

Node.js + Express で構築した TODO 管理 Web アプリケーション。ブラウザ上のシングルページ HTML からバックエンド REST API を fetch 呼び出しし、PostgreSQL に TODO を永続化する。UI フレームワーク・ビルドツールは使用せず、バニラ JS で実装している。

---

## 2. 技術スタック

| 分類 | 技術 | バージョン | 採用理由 |
|------|------|-----------|---------|
| ランタイム | Node.js | LTS | Express が動作する最小構成として |
| Web フレームワーク | Express | ^4.18 | 軽量かつルーティング・ミドルウェアが充実 |
| DB ドライバ | pg (node-postgres) | ^8.20 | PostgreSQL 公式推奨のネイティブクライアント |
| 環境変数管理 | dotenv | ^17 | `.env` ファイルを `process.env` に展開する標準的な方法 |
| 開発サーバ | nodemon | ^3 | ファイル変更を検知してサーバを自動再起動 |
| テスト | Jest | ^29 | Node / jsdom 両環境をサポートし設定が最小限 |
| テスト（フロントエンド環境） | jest-environment-jsdom | ^29 | ブラウザ DOM を Node.js 上でエミュレート |
| テスト（HTTP クライアント） | supertest | ^7 | Express アプリを HTTP サーバなしでテスト |

---

## 3. ディレクトリ構成と各ファイルの役割

```
my-claude-project/
├── src/
│   ├── index.js              # エントリポイント。Express アプリの組み立てとサーバ起動
│   ├── routes/
│   │   └── todos.js          # /todos の CRUD ルーター（GET/POST/PATCH/DELETE）
│   └── db/
│       ├── pool.js           # PostgreSQL 接続プール（pg.Pool）のシングルトン
│       └── init.sql          # todos テーブル初期化 SQL（手動実行用）
├── public/
│   └── index.html            # フロントエンド SPA。fetch API で /todos を呼び出す
├── db/
│   └── migrations/
│       └── 001_create_todos.sql  # todos テーブル + updated_at 自動更新トリガー
├── tests/
│   ├── backend/              # testEnvironment: node — Express ルーターの統合テスト
│   ├── frontend/             # testEnvironment: jsdom — UI ロジックの単体テスト
│   └── routes/               # ルーター単位のテスト
├── docs/
│   └── architecture.md       # 本ドキュメント
├── .env                      # 環境変数（Git 管理外を推奨）
└── package.json
```

---

## 4. データフロー図

```
ブラウザ (public/index.html)
  │
  │  GET /              静的ファイル配信
  ▼
Express (src/index.js)
  │  express.static → public/index.html を返す
  │
  │  fetch /todos/*     API リクエスト
  ▼
Router (src/routes/todos.js)
  │  バリデーション → SQL 組み立て
  ▼
Pool (src/db/pool.js)
  │  pg.Pool.query()
  ▼
PostgreSQL
  │  todos テーブルを読み書き
  │
  ▼ （レスポンス）
Router → Express → ブラウザ
```

---

## 5. API エンドポイント一覧

### GET /todos
全件取得。クエリパラメータで完了状態フィルタが可能。

| 項目 | 内容 |
|------|------|
| クエリパラメータ | `?completed=true` / `?completed=false`（省略時は全件） |
| レスポンス 200 | `[{ id, title, completed, created_at, updated_at }, ...]` |

---

### GET /todos/:id
指定 ID の TODO を 1 件取得。

| 項目 | 内容 |
|------|------|
| パスパラメータ | `id` — 正の整数 |
| レスポンス 200 | `{ id, title, completed, created_at, updated_at }` |
| レスポンス 400 | `{ error: "無効な ID です" }` |
| レスポンス 404 | `{ error: "指定された TODO が見つかりません" }` |

---

### POST /todos
新規 TODO を作成。

| 項目 | 内容 |
|------|------|
| リクエストボディ | `{ "title": "文字列（必須）" }` |
| レスポンス 201 | `{ id, title, completed, created_at, updated_at }` |
| レスポンス 400 | `{ error: "title は必須です" }` |

---

### PATCH /todos/:id
title・completed を部分更新。両方省略はエラー。

| 項目 | 内容 |
|------|------|
| パスパラメータ | `id` — 正の整数 |
| リクエストボディ | `{ "title"?: "文字列", "completed"?: true/false }` |
| レスポンス 200 | `{ id, title, completed, created_at, updated_at }` |
| レスポンス 400 | バリデーションエラー詳細 |
| レスポンス 404 | `{ error: "指定された TODO が見つかりません" }` |

---

### DELETE /todos/:id
指定 ID の TODO を削除。

| 項目 | 内容 |
|------|------|
| パスパラメータ | `id` — 正の整数 |
| レスポンス 204 | ボディなし |
| レスポンス 400 | `{ error: "無効な ID です" }` |
| レスポンス 404 | `{ error: "指定された TODO が見つかりません" }` |

---

## 6. データベーススキーマ

### todos テーブル

```sql
CREATE TABLE todos (
  id         BIGSERIAL   PRIMARY KEY,
  title      TEXT        NOT NULL,
  completed  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| `id` | BIGSERIAL | PRIMARY KEY | 自動採番の一意識別子 |
| `title` | TEXT | NOT NULL | TODO のタイトル。空文字はアプリ層で拒否 |
| `completed` | BOOLEAN | NOT NULL, DEFAULT false | 完了フラグ。未完了は false |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | レコード作成日時（タイムゾーン付き） |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 最終更新日時。UPDATE 時にトリガーで自動更新 |

`db/migrations/001_create_todos.sql` には `updated_at` を UPDATE のたびに `NOW()` に書き換える PostgreSQL トリガー（`todos_updated_at`）も含まれている。

---

## 7. 環境変数一覧

`.env` ファイルに記述し、`dotenv` が `src/index.js` 起動時に読み込む。

| 変数名 | デフォルト値 | 説明 |
|--------|------------|------|
| `DB_HOST` | `localhost` | PostgreSQL ホスト名 |
| `DB_PORT` | `5432` | PostgreSQL ポート番号 |
| `DB_NAME` | `todo_db` | 接続するデータベース名 |
| `DB_USER` | `todo_user` | DB 接続ユーザー名 |
| `DB_PASSWORD` | — | DB 接続パスワード |
| `PORT` | `3000` | Express がリッスンする HTTP ポート |

`.env` ファイルは機密情報を含むため、`.gitignore` に追加して Git 管理外にすることを推奨する。

---

## 8. ローカル開発の起動手順

### 前提
- Node.js（LTS）インストール済み
- PostgreSQL が起動中

### 手順

```bash
# 1. 依存パッケージをインストール
npm install

# 2. 環境変数を設定（.env を編集）
cp .env.example .env   # テンプレートがある場合
# DB_HOST / DB_NAME / DB_USER / DB_PASSWORD を環境に合わせて変更

# 3. データベース・テーブルを作成
psql -U todo_user -d todo_db -f src/db/init.sql
# または マイグレーションファイルを使用
psql -U todo_user -d todo_db -f db/migrations/001_create_todos.sql

# 4. 開発サーバを起動（ファイル変更で自動リロード）
npm run dev

# 5. ブラウザで確認
# http://localhost:3000
```

### テスト実行

```bash
npm test              # 全テスト実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ付き実行
```
