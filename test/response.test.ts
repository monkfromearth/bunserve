import { expect, test } from 'bun:test';
import { bunserve } from '../src';

test('CSV response with custom filename', async () => {
  const app = bunserve();

  app.get('/export', ({ set }) => {
    set.content = { type: 'csv', filename: 'users.csv' };
    return 'name,email\nJohn,john@example.com';
  });

  const response = await app.fetch(new Request('http://localhost/export'));

  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('text/csv');
  expect(response.headers.get('Content-Disposition')).toBe(
    'attachment; filename="users.csv"'
  );
  const text = await response.text();
  expect(text).toBe('name,email\nJohn,john@example.com');
});

test('Image responses - PNG', async () => {
  const app = bunserve();

  app.get('/image.png', ({ set }) => {
    set.content = 'png';
    return 'fake-png-data';
  });

  const response = await app.fetch(new Request('http://localhost/image.png'));

  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('image/png');
});

test('Image responses - SVG', async () => {
  const app = bunserve();

  app.get('/image.svg', ({ set }) => {
    set.content = 'svg';
    return '<svg></svg>';
  });

  const response = await app.fetch(new Request('http://localhost/image.svg'));

  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('image/svg');
});

test('XML response', async () => {
  const app = bunserve();

  app.get('/feed', ({ set }) => {
    set.content = 'xml';
    return '<?xml version="1.0"?><feed></feed>';
  });

  const response = await app.fetch(new Request('http://localhost/feed'));

  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('application/xml');
});

test('Cache-Control header - 1 hour', async () => {
  const app = bunserve();

  app.get('/cached', ({ set }) => {
    set.cache = '1h';
    return 'cached content';
  });

  const response = await app.fetch(new Request('http://localhost/cached'));

  expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
});

test('Cache-Control header - 30 days', async () => {
  const app = bunserve();

  app.get('/cached', ({ set }) => {
    set.cache = '30d';
    return 'cached content';
  });

  const response = await app.fetch(new Request('http://localhost/cached'));

  expect(response.headers.get('Cache-Control')).toBe('public, max-age=2592000');
});

test('Cache-Control header - invalid duration falls back to 0', async () => {
  const app = bunserve();

  app.get('/cached', ({ set }) => {
    set.cache = 'invalid';
    return 'content';
  });

  const response = await app.fetch(new Request('http://localhost/cached'));

  // Invalid duration should default to 0
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=0');
});

test('Redirect response', async () => {
  const app = bunserve();

  app.get('/old', ({ set }) => {
    set.redirect = '/new';
    set.status = 302;
    return null;
  });

  const response = await app.fetch(new Request('http://localhost/old'), {
    redirect: 'manual'
  });

  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/new');
});

test('Custom headers', async () => {
  const app = bunserve();

  app.get('/custom', ({ set }) => {
    set.headers['X-Custom-Header'] = 'custom-value';
    set.headers['X-Request-ID'] = '12345';
    return { success: true };
  });

  const response = await app.fetch(new Request('http://localhost/custom'));

  expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
  expect(response.headers.get('X-Request-ID')).toBe('12345');
});

test('Auto content-type detection - JSON object', async () => {
  const app = bunserve();

  app.get('/auto-json', () => {
    return { message: 'hello' };
  });

  const response = await app.fetch(new Request('http://localhost/auto-json'));

  expect(response.headers.get('Content-Type')).toContain('application/json');
});

test('Auto content-type detection - string', async () => {
  const app = bunserve();

  app.get('/auto-text', () => {
    return 'plain text';
  });

  const response = await app.fetch(new Request('http://localhost/auto-text'));

  expect(response.headers.get('Content-Type')).toContain('text/plain');
});

test('Auto content-type detection - HTML (explicit)', async () => {
  const app = bunserve();

  app.get('/auto-html', ({ set }) => {
    // Auto mode treats strings as text/plain, so explicitly set html
    set.content = 'html';
    return '<html><body>Hello</body></html>';
  });

  const response = await app.fetch(new Request('http://localhost/auto-html'));

  expect(response.headers.get('Content-Type')).toContain('text/html');
});

test('Multiple response headers can be set', async () => {
  const app = bunserve();

  app.get('/multi-headers', ({ set }) => {
    set.headers['X-Header-1'] = 'value1';
    set.headers['X-Header-2'] = 'value2';
    set.headers['X-Header-3'] = 'value3';
    return 'ok';
  });

  const response = await app.fetch(
    new Request('http://localhost/multi-headers')
  );

  expect(response.headers.get('X-Header-1')).toBe('value1');
  expect(response.headers.get('X-Header-2')).toBe('value2');
  expect(response.headers.get('X-Header-3')).toBe('value3');
});

test('Response with null returns empty 200', async () => {
  const app = bunserve();

  app.get('/null', () => {
    return null;
  });

  const response = await app.fetch(new Request('http://localhost/null'));

  expect(response.status).toBe(200);
  const text = await response.text();
  expect(text).toBe('');
});

test('Response with 204 No Content', async () => {
  const app = bunserve();

  app.delete('/resource', ({ set }) => {
    set.status = 204;
    return null;
  });

  const response = await app.fetch(
    new Request('http://localhost/resource', { method: 'DELETE' })
  );

  expect(response.status).toBe(204);
});
