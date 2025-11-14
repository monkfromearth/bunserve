import { expect, test } from 'bun:test';
import { bunserve } from '../src/index';

test('body size limits - default 1MB limit in options', () => {
  const app = bunserve({ max_body_size: 1048576 });

  // Verify server was created with option
  expect(app).toBeDefined();
});

test('body size limits - custom limit in options', () => {
  const app = bunserve({ max_body_size: 5000000 }); // 5MB

  // Verify server was created with custom option
  expect(app).toBeDefined();
});

test('body size limits - accepts large body within limit', async () => {
  const app = bunserve({ max_body_size: 10000 }); // 10KB

  app.post('/upload', async ({ body }) => {
    return { size: JSON.stringify(body).length, data: body };
  });

  const small_data = { message: 'Small payload', data: 'x'.repeat(100) };

  const response = await app.fetch(
    new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(small_data)
    })
  );

  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.data.message).toBe('Small payload');
});

test('body size limits - configuration validation', () => {
  // Test various valid configurations
  const app_1mb = bunserve({ max_body_size: 1048576 });
  const app_10mb = bunserve({ max_body_size: 10485760 });
  const app_100mb = bunserve({ max_body_size: 104857600 });

  expect(app_1mb).toBeDefined();
  expect(app_10mb).toBeDefined();
  expect(app_100mb).toBeDefined();
});

test('body size limits - zero means no limit', () => {
  const app = bunserve({ max_body_size: 0 });

  // Verify server was created (0 disables limit in Bun)
  expect(app).toBeDefined();
});

test('body size limits - works with middleware', async () => {
  const app = bunserve({ max_body_size: 10000 });

  app.use(async (context, next) => {
    context.set.headers['X-Middleware'] = 'true';
    await next();
  });

  app.post('/test', ({ body }) => {
    return { received: true, body };
  });

  const response = await app.fetch(
    new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    })
  );

  expect(response.status).toBe(200);
  expect(response.headers.get('X-Middleware')).toBe('true');
});

test('body size limits - default when not specified', () => {
  const app = bunserve(); // No max_body_size specified

  // Verify server was created with defaults
  expect(app).toBeDefined();
});

test('body size limits - text body within limit', async () => {
  const app = bunserve({ max_body_size: 5000 });

  app.post('/text', async ({ body }) => {
    return { length: body.length, body };
  });

  const text_data = 'Short text content';

  const response = await app.fetch(
    new Request('http://localhost/text', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text_data
    })
  );

  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.body).toBe(text_data);
});

test('body size limits - form data within limit', async () => {
  const app = bunserve({ max_body_size: 10000 });

  app.post('/form', async ({ body }) => {
    return { received: true, body };
  });

  const form_data = new FormData();
  form_data.append('name', 'Test User');
  form_data.append('email', 'test@example.com');

  const response = await app.fetch(
    new Request('http://localhost/form', {
      method: 'POST',
      body: form_data
    })
  );

  expect(response.status).toBe(200);
});

test('body size limits - multiple requests with different sizes', async () => {
  const app = bunserve({ max_body_size: 10000 });

  app.post('/data', async ({ body }) => {
    return { size: JSON.stringify(body).length };
  });

  // Small request
  const small_response = await app.fetch(
    new Request('http://localhost/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'small' })
    })
  );
  expect(small_response.status).toBe(200);

  // Medium request
  const medium_response = await app.fetch(
    new Request('http://localhost/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'x'.repeat(1000) })
    })
  );
  expect(medium_response.status).toBe(200);
});

test('body size limits - GET requests not affected', async () => {
  const app = bunserve({ max_body_size: 1000 });

  app.get('/data', ({ query }) => {
    return { query };
  });

  const response = await app.fetch(
    new Request('http://localhost/data?key=value&long=' + 'x'.repeat(2000))
  );

  expect(response.status).toBe(200);
});

test('body size limits - different content types', async () => {
  const app = bunserve({ max_body_size: 10000 });

  app.post('/any', async ({ body, request }) => {
    return {
      content_type: request.headers.get('content-type'),
      received: true
    };
  });

  // JSON
  const json_response = await app.fetch(
    new Request('http://localhost/any', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'json' })
    })
  );
  expect(json_response.status).toBe(200);

  // Form
  const form_response = await app.fetch(
    new Request('http://localhost/any', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'key=value&foo=bar'
    })
  );
  expect(form_response.status).toBe(200);

  // Text
  const text_response = await app.fetch(
    new Request('http://localhost/any', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'plain text content'
    })
  );
  expect(text_response.status).toBe(200);
});
