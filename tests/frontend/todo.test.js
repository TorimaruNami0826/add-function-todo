/**
 * public/index.html フロントエンドロジックのテスト
 *
 * HTML 内の <script> が const を使うため document.write では再宣言エラーになる。
 * テストごとに new JSDOM() で独立したスコープを作り、beforeParse で
 * window.fetch に jest.fn() を注入することで標準的なモックとして扱う。
 */

const { JSDOM } = require('jsdom');
const fs   = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.resolve(__dirname, '../../public/index.html'),
  'utf-8'
);

// ─── ヘルパー ───────────────────────────────────────────────────

// fetchMock（jest.fn）を window.fetch に差し替えた JSDOM を返す
function createDOM(fetchMock) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = fetchMock;
    },
  });
}

// fetch が返すレスポンスオブジェクトを生成する
function mockRes(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: () => Promise.resolve(body) };
}

// fetch などの非同期処理（Promise チェーン）が完了するまで待つ
const tick = () => new Promise(r => setTimeout(r, 0));

// ─── フィクスチャ ──────────────────────────────────────────────

const TODO_A = { id: 1, title: '買い物', completed: false, createdAt: '' };
const TODO_B = { id: 2, title: '掃除',   completed: true,  createdAt: '' };

// ─────────────────────────────────────────────────────────────────
// 1. TODO リストのレンダリング
// ─────────────────────────────────────────────────────────────────

describe('TODO リストのレンダリング', () => {
  test('取得した TODO がタイトルとともに全件描画される', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A, TODO_B]));

    // Act
    const dom = createDOM(fetchMock);
    await tick();

    // Assert
    const items = dom.window.document.querySelectorAll('.todo-item');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.todo-title').textContent).toBe('買い物');
    expect(items[1].querySelector('.todo-title').textContent).toBe('掃除');
  });

  test('未完了 TODO に .completed クラスがなくチェックボックスが unchecked になる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]));

    // Act
    const dom = createDOM(fetchMock);
    await tick();

    // Assert
    const li       = dom.window.document.querySelector('.todo-item');
    const checkbox = li.querySelector('input[type="checkbox"]');
    expect(li.classList.contains('completed')).toBe(false);
    expect(checkbox.checked).toBe(false);
  });

  test('完了済み TODO に .completed クラスが付きチェックボックスが checked になる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_B]));

    // Act
    const dom = createDOM(fetchMock);
    await tick();

    // Assert
    const li       = dom.window.document.querySelector('.todo-item');
    const checkbox = li.querySelector('input[type="checkbox"]');
    expect(li.classList.contains('completed')).toBe(true);
    expect(checkbox.checked).toBe(true);
  });

  test('TODO が空のとき空状態メッセージが表示される', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([]));

    // Act
    const dom = createDOM(fetchMock);
    await tick();

    // Assert
    const emptyMsg = dom.window.document.getElementById('empty-msg');
    expect(emptyMsg.style.display).not.toBe('none');
  });

  test('TODO がある場合は空状態メッセージが非表示になる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]));

    // Act
    const dom = createDOM(fetchMock);
    await tick();

    // Assert
    const emptyMsg = dom.window.document.getElementById('empty-msg');
    expect(emptyMsg.style.display).toBe('none');
  });

  test('GET 失敗時にエラーメッセージが表示される', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes({}, { ok: false, status: 500 }));

    // Act
    const dom = createDOM(fetchMock);
    await tick();

    // Assert
    const errorEl = dom.window.document.getElementById('error-msg');
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. 追加フォームの送信（POST）
// ─────────────────────────────────────────────────────────────────

describe('TODO の追加', () => {
  test('追加ボタンクリックで POST /todos が正しいボディで呼ばれる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([]))                                        // 初期 GET
      .mockResolvedValueOnce(mockRes({ ...TODO_A, title: '新タスク' }, { status: 201 })); // POST

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.getElementById('new-title').value = '新タスク';
    dom.window.document.getElementById('add-btn').click();
    await tick();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith('/todos', expect.objectContaining({
      method: 'POST',
      body:   JSON.stringify({ title: '新タスク', priority: 2 }),
    }));
  });

  test('POST 成功後に入力欄がクリアされリストに項目が追加される', async () => {
    // Arrange
    const newTodo   = { id: 1, title: '新タスク', completed: false, createdAt: '' };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([]))
      .mockResolvedValueOnce(mockRes(newTodo, { status: 201 }));

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.getElementById('new-title').value = '新タスク';
    dom.window.document.getElementById('add-btn').click();
    await tick();

    // Assert
    expect(dom.window.document.getElementById('new-title').value).toBe('');
    const items = dom.window.document.querySelectorAll('.todo-item');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.todo-title').textContent).toBe('新タスク');
  });

  test('Enter キーでも POST /todos が呼ばれる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([]))
      .mockResolvedValueOnce(mockRes(TODO_A, { status: 201 }));

    const dom   = createDOM(fetchMock);
    await tick();
    const input = dom.window.document.getElementById('new-title');

    // Act
    input.value = '買い物';
    input.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    await tick();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith('/todos', expect.objectContaining({
      method: 'POST',
    }));
  });

  test('タイトルが空のとき POST が呼ばれずエラーが表示される', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([])); // 初期 GET のみ

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.getElementById('new-title').value = '';
    dom.window.document.getElementById('add-btn').click();
    await tick();

    // Assert — 初期 GET の 1 回のみで POST は呼ばれない
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const errorEl = dom.window.document.getElementById('error-msg');
    expect(errorEl.style.display).toBe('block');
  });

  test('POST 失敗時（サーバーエラー）にエラーメッセージが表示される', async () => {
    // Arrange — クライアントバリデーションは通るタイトルでサーバーが 400 を返す
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([]))
      .mockResolvedValueOnce(mockRes({ error: 'サーバーエラー' }, { ok: false, status: 400 }));

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.getElementById('new-title').value = '有効なタイトル';
    dom.window.document.getElementById('add-btn').click();
    await tick();

    // Assert
    const errorEl = dom.window.document.getElementById('error-msg');
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toContain('サーバーエラー');
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. 完了チェックボックスのクリック（PATCH）
// ─────────────────────────────────────────────────────────────────

describe('完了チェックボックス', () => {
  test('チェックをオンにすると PATCH /todos/:id が completed:true で呼ばれる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]))                          // 初期 GET（completed:false）
      .mockResolvedValueOnce(mockRes({ ...TODO_A, completed: true }));   // PATCH

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    const checkbox = dom.window.document.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    await tick();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(`/todos/${TODO_A.id}`, expect.objectContaining({
      method: 'PATCH',
      body:   JSON.stringify({ completed: true }),
    }));
  });

  test('チェックをオフにすると PATCH /todos/:id が completed:false で呼ばれる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_B]))                           // 初期 GET（completed:true）
      .mockResolvedValueOnce(mockRes({ ...TODO_B, completed: false }));   // PATCH

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    const checkbox = dom.window.document.querySelector('input[type="checkbox"]');
    checkbox.checked = false;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    await tick();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(`/todos/${TODO_B.id}`, expect.objectContaining({
      method: 'PATCH',
      body:   JSON.stringify({ completed: false }),
    }));
  });

  test('PATCH 成功後に li へ .completed クラスが付く', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]))
      .mockResolvedValueOnce(mockRes({ ...TODO_A, completed: true }));

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    const li       = dom.window.document.querySelector('.todo-item');
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    await tick();

    // Assert
    expect(li.classList.contains('completed')).toBe(true);
  });

  test('PATCH 失敗時にチェックが元の状態に戻りエラーが表示される', async () => {
    // Arrange — 初期は未完了（completed:false）
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]))
      .mockResolvedValueOnce(mockRes({}, { ok: false, status: 500 })); // PATCH 失敗

    const dom = createDOM(fetchMock);
    await tick();

    // Act — チェックをオンにする
    const checkbox = dom.window.document.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    await tick();

    // Assert — false に巻き戻り、エラーが表示される
    expect(checkbox.checked).toBe(false);
    const errorEl = dom.window.document.getElementById('error-msg');
    expect(errorEl.style.display).toBe('block');
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. 削除ボタンのクリック（DELETE）
// ─────────────────────────────────────────────────────────────────

describe('削除ボタン', () => {
  test('削除ボタンクリックで DELETE /todos/:id が呼ばれる', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]))  // 初期 GET
      .mockResolvedValueOnce(mockRes(null));      // DELETE

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.querySelector('.delete-btn').click();
    await tick();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(`/todos/${TODO_A.id}`, expect.objectContaining({
      method: 'DELETE',
    }));
  });

  test('削除成功後に該当アイテムがリストから消える', async () => {
    // Arrange — 2 件あり最初の 1 件を削除する
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A, TODO_B]))
      .mockResolvedValueOnce(mockRes(null));

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.querySelector('.delete-btn').click();
    await tick();

    // Assert
    const items = dom.window.document.querySelectorAll('.todo-item');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.todo-title').textContent).toBe('掃除');
  });

  test('最後の 1 件を削除すると空状態メッセージが表示される', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]))
      .mockResolvedValueOnce(mockRes(null));

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.querySelector('.delete-btn').click();
    await tick();

    // Assert
    const emptyMsg = dom.window.document.getElementById('empty-msg');
    expect(emptyMsg.style.display).not.toBe('none');
  });

  test('DELETE 失敗時にエラーが表示されアイテムが残る', async () => {
    // Arrange
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockRes([TODO_A]))
      .mockResolvedValueOnce(mockRes({}, { ok: false, status: 404 }));

    const dom = createDOM(fetchMock);
    await tick();

    // Act
    dom.window.document.querySelector('.delete-btn').click();
    await tick();

    // Assert — アイテムは残り、エラーが表示される
    expect(dom.window.document.querySelectorAll('.todo-item')).toHaveLength(1);
    const errorEl = dom.window.document.getElementById('error-msg');
    expect(errorEl.style.display).toBe('block');
  });
});
