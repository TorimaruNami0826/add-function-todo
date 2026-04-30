const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// GET /todos — 全件取得（id 昇順）。?completed=true/false でフィルタ可
router.get('/', async (req, res) => {
  try {
    let text = 'SELECT id, title, completed, created_at, updated_at FROM todos';
    const values = [];

    if (req.query.completed !== undefined) {
      // 文字列 'true'/'false' を真偽値に変換してパラメータ化クエリに渡す
      values.push(req.query.completed === 'true');
      text += ' WHERE completed = $1';
    }

    text += ' ORDER BY id';

    const { rows } = await pool.query(text, values);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバエラーが発生しました' });
  }
});

// GET /todos/:id — 1件取得
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '無効な ID です' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '指定された TODO が見つかりません' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバエラーが発生しました' });
  }
});

// POST /todos — 新規作成
// リクエストボディ: { title: 文字列 }
router.post('/', async (req, res) => {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title は必須です' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO todos (title)
       VALUES ($1)
       RETURNING id, title, completed, created_at, updated_at`,
      [title.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバエラーが発生しました' });
  }
});

// PATCH /todos/:id — 部分更新（title / completed）
// リクエストボディ: { title?: 文字列, completed?: 真偽値 }
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '無効な ID です' });
  }

  const { title, completed } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title は空にできません' });
    }
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed は boolean である必要があります' });
    }
  }
  if (title === undefined && completed === undefined) {
    return res.status(400).json({ error: '更新するフィールドがありません' });
  }

  // 動的に SET 句を組み立てる（updated_at は常に NOW() で自動更新）
  const fields = [];
  const values = [];
  let idx = 1;

  if (title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(title.trim());
  }
  if (completed !== undefined) {
    fields.push(`completed = $${idx++}`);
    values.push(completed);
  }
  fields.push('updated_at = NOW()');
  values.push(id);

  try {
    const { rows, rowCount } = await pool.query(
      `UPDATE todos
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, title, completed, created_at, updated_at`,
      values
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: '指定された TODO が見つかりません' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバエラーが発生しました' });
  }
});

// DELETE /todos/:id — 削除
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '無効な ID です' });
  }

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM todos WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: '指定された TODO が見つかりません' });
    }

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'サーバエラーが発生しました' });
  }
});

module.exports = router;
