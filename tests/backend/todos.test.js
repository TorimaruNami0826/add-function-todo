const express  = require('express');
const request  = require('supertest');
const pool     = require('../../src/db/pool');

// pool.query を jest のモックに差し替え（実際の PostgreSQL には接続しない）
jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

// テスト用アプリを一度だけ組み立てる
const todosRouter = require('../../src/routes/todos');
const app = express();
app.use(express.json());
app.use('/todos', todosRouter);

// テストごとにモックの呼び出し履歴をリセットする
beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────
// GET /todos
// ─────────────────────────────────────────
describe('GET /todos', () => {
  test('DB が空の場合は空配列を返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({ rows: [] });

    // Act
    const res = await request(app).get('/todos');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('登録済みの TODO を全件返す', async () => {
    // Arrange
    const mockRows = [
      { id: 1, title: 'タスク1', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 2, title: 'タスク2', completed: true,  created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    // Act
    const res = await request(app).get('/todos');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('タスク1');
    expect(res.body[1].title).toBe('タスク2');
  });
});

// ─────────────────────────────────────────
// POST /todos
// ─────────────────────────────────────────
describe('POST /todos', () => {
  test('有効な title で TODO を作成し 201 とオブジェクトを返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: '買い物', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' }],
    });

    // Act
    const res = await request(app).post('/todos').send({ title: '買い物' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, title: '買い物', completed: false });
  });

  test('title の前後の空白はトリムされて DB に渡される', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'タスク', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' }],
    });

    // Act
    const res = await request(app).post('/todos').send({ title: '  タスク  ' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('タスク');
    // トリム済みタイトルとデフォルト priority がパラメータとして渡されていること
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['タスク', 2]);
  });

  test('title が未指定の場合 400 を返す', async () => {
    // Arrange — バリデーションで弾かれるため DB モック不要

    // Act
    const res = await request(app).post('/todos').send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('title が空文字の場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).post('/todos').send({ title: '' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('title が空白のみの場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).post('/todos').send({ title: '   ' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('title が文字列以外（数値）の場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).post('/todos').send({ title: 123 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────
// PATCH /todos/:id
// ─────────────────────────────────────────
describe('PATCH /todos/:id', () => {
  // 各テスト前に POST でテスト用 TODO を作成し todoId を記録する
  let todoId;
  beforeEach(async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: '元のタスク', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' }],
    });
    const res = await request(app).post('/todos').send({ title: '元のタスク' });
    todoId = res.body.id;
  });

  test('title を更新できる', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({
      rows: [{ id: todoId, title: '更新後タスク', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }],
      rowCount: 1,
    });

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ title: '更新後タスク' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('更新後タスク');
    expect(res.body.id).toBe(todoId);
  });

  test('completed を true に更新できる', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({
      rows: [{ id: todoId, title: '元のタスク', completed: true, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }],
      rowCount: 1,
    });

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ completed: true });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  test('title と completed を同時に更新できる', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({
      rows: [{ id: todoId, title: '同時更新', completed: true, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }],
      rowCount: 1,
    });

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ title: '同時更新', completed: true });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: '同時更新', completed: true });
  });

  test('更新フィールドがない場合 400 を返す', async () => {
    // Arrange — バリデーションで弾かれるため DB モック不要

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('title の前後の空白はトリムされる', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({
      rows: [{ id: todoId, title: 'trimされる', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' }],
      rowCount: 1,
    });

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ title: '  trimされる  ' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('trimされる');
  });

  test('存在しない id の場合 404 を返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    // Act
    const res = await request(app).patch('/todos/9999').send({ title: '幽霊タスク' });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('title が空文字の場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ title: '' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('title が空白のみの場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ title: '   ' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('completed が boolean 以外（文字列）の場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ completed: 'true' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('completed が boolean 以外（数値）の場合 400 を返す', async () => {
    // Arrange

    // Act
    const res = await request(app).patch(`/todos/${todoId}`).send({ completed: 1 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────
// DELETE /todos/:id
// ─────────────────────────────────────────
describe('DELETE /todos/:id', () => {
  let todoId;
  beforeEach(async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: '削除対象', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' }],
    });
    const res = await request(app).post('/todos').send({ title: '削除対象' });
    todoId = res.body.id;
  });

  test('存在する id を削除すると 204 を返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    // Act
    const res = await request(app).delete(`/todos/${todoId}`);

    // Assert
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  test('存在しない id の場合 404 を返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    // Act
    const res = await request(app).delete('/todos/9999');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('同じ id を 2 回削除すると 2 回目は 404 を返す', async () => {
    // Arrange — 1回目は成功、2回目は rowCount: 0 で 404
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    // Act
    await request(app).delete(`/todos/${todoId}`);
    const res = await request(app).delete(`/todos/${todoId}`);

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
