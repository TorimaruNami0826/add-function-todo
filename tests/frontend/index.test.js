// jsdom 環境で public/index.html の DOM とロジックをテストする
// document.write による再宣言エラーを避けるため、テストごとに new JSDOM() で独立したスコープを作る

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.resolve(__dirname, '../../public/index.html'),
  'utf-8'
);

// fetchMock を受け取って新しい JSDOM インスタンスを返す
// beforeParse で window.fetch を注入することで、スクリプト実行前にモックが有効になる
function createDOM(fetchMock) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = fetchMock;
    },
  });
}

// レスポンス配列を順番に返す fetch モックを生成する
function buildFetchMock(responses) {
  let callIndex = 0;
  return jest.fn(() => {
    const res = responses[callIndex++] ?? responses[responses.length - 1];
    return Promise.resolve({
      ok: res.ok ?? true,
      status: res.status ?? 200,
      json: () => Promise.resolve(res.body),
    });
  });
}

// 非同期処理（fetch → 描画）が完了するまで待つ
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('初期表示', () => {
  test('起動時に GET /todos が呼ばれる', async () => {
    const fetchMock = buildFetchMock([{ body: [] }]);
    createDOM(fetchMock);
    await tick();

    expect(fetchMock).toHaveBeenCalledWith('/todos');
  });

  test('TODO が空のとき空状態メッセージが表示される', async () => {
    const fetchMock = buildFetchMock([{ body: [] }]);
    const dom = createDOM(fetchMock);
    await tick();

    const emptyMsg = dom.window.document.getElementById('empty-msg');
    expect(emptyMsg.style.display).not.toBe('none');
  });

  test('取得した TODO がリストに描画される', async () => {
    const fetchMock = buildFetchMock([{
      body: [
        { id: 1, title: '買い物', completed: false, createdAt: '' },
        { id: 2, title: '掃除', completed: true,  createdAt: '' },
      ],
    }]);
    const dom = createDOM(fetchMock);
    await tick();

    const items = dom.window.document.querySelectorAll('.todo-item');
    expect(items).toHaveLength(2);
    // 完了済みアイテムに .completed クラスが付いているか確認する
    expect(items[1].classList.contains('completed')).toBe(true);
  });
});

describe('TODO の追加', () => {
  test('追加ボタンをクリックすると POST /todos が呼ばれる', async () => {
    // 1回目: 初期 GET、2回目: POST のレスポンス
    const fetchMock = buildFetchMock([
      { body: [] },
      { status: 201, body: { id: 1, title: '買い物', completed: false, createdAt: '' } },
    ]);
    const dom = createDOM(fetchMock);
    await tick();

    dom.window.document.getElementById('new-title').value = '買い物';
    dom.window.document.getElementById('add-btn').click();
    await tick();

    expect(fetchMock).toHaveBeenCalledWith('/todos', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: '買い物', priority: 2 }),
    }));
  });

  test('title が空のとき POST が呼ばれない', async () => {
    const fetchMock = buildFetchMock([{ body: [] }]);
    const dom = createDOM(fetchMock);
    await tick();

    // 入力欄を空のままボタンをクリックする
    dom.window.document.getElementById('new-title').value = '';
    dom.window.document.getElementById('add-btn').click();
    await tick();

    // 初期の GET のみで POST は呼ばれていないことを確認する
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
