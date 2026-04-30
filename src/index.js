require('dotenv').config();
const express = require('express');
const path = require('path');
const todosRouter = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON リクエストボディを解析する
app.use(express.json());

// public/ ディレクトリを静的ファイルとして配信する
app.use(express.static(path.join(__dirname, '..', 'public')));

// /todos エンドポイントにルーターを紐付ける
app.use('/todos', todosRouter);

// 存在しないパスへのフォールバック
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// JSON パースエラーを 400 で返す（不正なリクエストボディへの対処）
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'リクエストボディが不正な JSON です' });
  }
  next(err);
});

// 直接実行時のみサーバを起動する（テストからの require では起動しない）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`サーバが起動しました → http://localhost:${PORT}`);
  });
}

module.exports = app;
