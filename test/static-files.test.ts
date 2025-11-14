import { expect, test, beforeAll, afterAll } from 'bun:test';
import { bunserve, static_files } from '../src/index';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dir, 'test-static');

beforeAll(async () => {
  // Create test directory and files
  await mkdir(TEST_DIR, { recursive: true });
  await mkdir(join(TEST_DIR, 'subdir'), { recursive: true });

  await writeFile(join(TEST_DIR, 'index.html'), '<html><body>Index</body></html>');
  await writeFile(join(TEST_DIR, 'test.txt'), 'Hello World');
  await writeFile(join(TEST_DIR, 'data.json'), '{"test": true}');
  await writeFile(join(TEST_DIR, 'style.css'), 'body { margin: 0; }');
  await writeFile(join(TEST_DIR, 'script.js'), 'console.log("test");');
  await writeFile(join(TEST_DIR, 'subdir', 'nested.txt'), 'Nested file');
});

afterAll(async () => {
  // Cleanup test directory
  await rm(TEST_DIR, { recursive: true, force: true });
});

test('static files - serve basic file', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/test.txt'));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Hello World');
  expect(response.headers.get('Content-Type')).toBe('text/plain');
});

test('static files - serve HTML file', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/index.html'));

  expect(response.status).toBe(200);
  expect(await response.text()).toContain('<html><body>Index</body></html>');
  expect(response.headers.get('Content-Type')).toBe('text/html');
});

test('static files - serve JSON file', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/data.json'));

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.test).toBe(true);
  expect(response.headers.get('Content-Type')).toBe('application/json');
});

test('static files - serve CSS file', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/style.css'));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('body { margin: 0; }');
  expect(response.headers.get('Content-Type')).toBe('text/css');
});

test('static files - serve JavaScript file', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/script.js'));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('console.log("test");');
  expect(response.headers.get('Content-Type')).toBe('application/javascript');
});

test('static files - serve nested file', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/subdir/nested.txt'));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Nested file');
});

test('static files - directory index', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR, index: 'index.html' }));

  const response = await app.fetch(new Request('http://localhost/'));

  expect(response.status).toBe(200);
  expect(await response.text()).toContain('<html><body>Index</body></html>');
});

test('static files - cache headers', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR, cache: '1h' }));

  const response = await app.fetch(new Request('http://localhost/test.txt'));

  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
});

test('static files - cache headers with days', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR, cache: '7d' }));

  const response = await app.fetch(new Request('http://localhost/test.txt'));

  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=604800');
});

test('static files - URL prefix', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR, prefix: '/static' }));

  const response = await app.fetch(new Request('http://localhost/static/test.txt'));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Hello World');
});

test('static files - prefix mismatch returns 404', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR, prefix: '/static' }));

  const response = await app.fetch(new Request('http://localhost/test.txt'));

  expect(response.status).toBe(404);
});

test('static files - non-existent file returns 404', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/nonexistent.txt'));

  expect(response.status).toBe(404);
});

test('static files - path traversal protection', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(new Request('http://localhost/../../../etc/passwd'));

  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe('Forbidden');
});

test('static files - only GET and HEAD methods', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  app.post('/test.txt', () => ({ message: 'POST handler' }));

  const response = await app.fetch(
    new Request('http://localhost/test.txt', { method: 'POST' })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.message).toBe('POST handler');
});

test('static files - works with other routes', async () => {
  const app = bunserve();

  app.get('/api/hello', () => ({ message: 'Hello API' }));

  app.use(static_files({ root: TEST_DIR }));

  // Test API route
  const api_response = await app.fetch(new Request('http://localhost/api/hello'));
  expect(api_response.status).toBe(200);
  const api_data = await api_response.json();
  expect(api_data.message).toBe('Hello API');

  // Test static file
  const static_response = await app.fetch(new Request('http://localhost/test.txt'));
  expect(static_response.status).toBe(200);
  expect(await static_response.text()).toBe('Hello World');
});

test('static files - HEAD request', async () => {
  const app = bunserve();

  app.use(static_files({ root: TEST_DIR }));

  const response = await app.fetch(
    new Request('http://localhost/test.txt', { method: 'HEAD' })
  );

  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('text/plain');
});
