const request    = require('supertest');
const express    = require('express');
const pool       = require('../../src/db/pool');

// pool.query を jest のモックに差し替え（実際の PostgreSQL には接続しない）
jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

// テスト用アプリ（dotenv 読み込みを避けるため index.js を経由しない）
const todosRouter = require('../../src/routes/todos');
const app = express();
app.use(express.json());
app.use('/todos', todosRouter);

beforeEach(() => {
  // テストごとにモックの呼び出し履歴をリセットする
  jest.clearAllMocks();
});

// ─────────────────────────────────────────
// GET /todos
// ─────────────────────────────────────────
describe('GET /todos', () => {
  test('200 と todos 配列を返す', async () => {
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
  });

  test('?completed=true でフィルタされた配列を返す', async () => {
    // Arrange
    const mockRows = [
      { id: 2, title: 'タスク2', completed: true, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    // Act
    const res = await request(app).get('/todos?completed=true');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].completed).toBe(true);
    // WHERE 句が含まれ、真偽値 true が渡されていることを確認する
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE completed'),
      [true],
    );
  });
});

// ─────────────────────────────────────────
// GET /todos/:id
// ─────────────────────────────────────────
describe('GET /todos/:id', () => {
  test('存在する id の場合 200 と todo を返す', async () => {
    // Arrange
    const mockRow = { id: 1, title: 'タスク1', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    // Act
    const res = await request(app).get('/todos/1');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.title).toBe('タスク1');
  });

  test('存在しない id の場合 404 を返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({ rows: [] });

    // Act
    const res = await request(app).get('/todos/999');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────
// POST /todos
// ─────────────────────────────────────────
describe('POST /todos', () => {
  test('201 と作成した todo を返す', async () => {
    // Arrange
    const mockRow = { id: 1, title: '新規タスク', completed: false, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' };
    pool.query.mockResolvedValueOnce({ rows: [mockRow] });

    // Act
    const res = await request(app).post('/todos').send({ title: '新規タスク' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('新規タスク');
    expect(res.body.completed).toBe(false);
  });

  test('title なしの場合 400 を返す', async () => {
    // Arrange — バリデーションで弾かれるため DB モック不要

    // Act
    const res = await request(app).post('/todos').send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────
// PATCH /todos/:id
// ─────────────────────────────────────────
describe('PATCH /todos/:id', () => {
  test('200 と更新した todo を返す', async () => {
    // Arrange
    const mockRow = { id: 1, title: 'タスク1', completed: true, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-02T00:00:00.000Z' };
    pool.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

    // Act
    const res = await request(app).patch('/todos/1').send({ completed: true });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.completed).toBe(true);
  });
});

// ─────────────────────────────────────────
// DELETE /todos/:id
// ─────────────────────────────────────────
describe('DELETE /todos/:id', () => {
  test('204 を返す', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    // Act
    const res = await request(app).delete('/todos/1');

    // Assert
    expect(res.status).toBe(204);
  });
});
