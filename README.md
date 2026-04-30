# TODO アプリ

Node.js + Express で構築したシンプルな TODO 管理アプリです。  
データはインメモリで管理します（サーバ再起動でリセットされます）。

---

## 起動方法

### 前提条件

- Node.js 18 以上

### インストール & 起動

```bash
# 依存パッケージをインストール
npm install

# サーバを起動（本番）
npm start

# サーバを起動（開発・ホットリロード）
npm run dev
```

起動後、ブラウザで http://localhost:3000 を開くと UI が表示されます。

ポートを変更したい場合は環境変数で指定します。

```bash
PORT=8080 npm start
```

---

## API エンドポイント一覧

ベース URL: `http://localhost:3000`

### TODO オブジェクト

```json
{
  "id": 1,
  "title": "牛乳を買う",
  "completed": false,
  "createdAt": "2026-04-23T10:00:00.000Z"
}
```

### エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/todos` | TODO を全件取得する |
| `POST` | `/todos` | TODO を新規作成する |
| `PATCH` | `/todos/:id` | TODO を部分更新する |
| `DELETE` | `/todos/:id` | TODO を削除する |

---

#### GET `/todos`

全件を配列で返します。

**レスポンス例 (200)**

```json
[
  { "id": 1, "title": "牛乳を買う", "completed": false, "createdAt": "..." },
  { "id": 2, "title": "掃除をする", "completed": true,  "createdAt": "..." }
]
```

---

#### POST `/todos`

**リクエストボディ**

```json
{ "title": "牛乳を買う" }
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | string | ✅ | TODO のタイトル（空文字不可） |

**レスポンス例 (201)**

```json
{ "id": 1, "title": "牛乳を買う", "completed": false, "createdAt": "..." }
```

---

#### PATCH `/todos/:id`

`title` と `completed` を個別に更新できます。両方同時の指定も可能です。

**リクエストボディ**

```json
{ "completed": true }
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | string | — | 新しいタイトル（空文字不可） |
| `completed` | boolean | — | 完了フラグ |

**レスポンス例 (200)**

```json
{ "id": 1, "title": "牛乳を買う", "completed": true, "createdAt": "..." }
```

---

#### DELETE `/todos/:id`

指定した TODO を削除します。成功時はボディなしで `204 No Content` を返します。

---

### エラーレスポンス

```json
{ "error": "エラーの説明" }
```

| ステータス | 発生条件 |
|---|---|
| `400` | リクエストボディのバリデーションエラー |
| `404` | 指定した `:id` の TODO が存在しない |

---

## ディレクトリ構成

```
.
├── package.json          # 依存パッケージ・スクリプト定義
├── README.md
├── public/
│   └── index.html        # フロントエンド UI（fetch API でバックエンドと通信）
└── src/
    ├── index.js          # Express サーバのエントリポイント・静的ファイル配信
    └── routes/
        └── todos.js      # /todos ルート定義（GET / POST / PATCH / DELETE）
```
