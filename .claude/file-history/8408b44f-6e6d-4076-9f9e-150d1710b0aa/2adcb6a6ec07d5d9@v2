const http = require('http');
const path = require('path');

// レスポンスを Promise で受け取るヘルパー
function request(app, method, reqPath, body) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path: reqPath,
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          const contentType = res.headers['content-type'] || '';
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: contentType.includes('application/json') && data ? JSON.parse(data) : data,
          });
        });
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

beforeEach(() => {
  jest.resetModules();
});

describe('src/index.js 統合テスト', () => {
  test('未定義パスは 404 と { error } を返す', async () => {
    const app = require('../../src/index');
    const res = await request(app, 'GET', '/no-such-path');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });

  test('GET /todos は index.js 経由で 200 を返す', async () => {
    const app = require('../../src/index');
    const res = await request(app, 'GET', '/todos');
    expect(res.status).toBe(200);
  });

  test('GET / は public/index.html を返す', async () => {
    const app = require('../../src/index');
    const res = await request(app, 'GET', '/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
