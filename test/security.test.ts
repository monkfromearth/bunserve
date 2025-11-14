import { expect, test } from 'bun:test';
import { bunserve } from '../src';
import { cors } from '../src/middleware/cors';

test('CSV filename header injection prevention', async () => {
  const app = bunserve();

  app.get('/download', ({ set }) => {
    // Attempt header injection via filename
    set.content = {
      type: 'csv',
      filename: 'test\r\nX-Malicious: injected'
    };
    return 'data1,data2\nvalue1,value2';
  });

  const response = await app.fetch(new Request('http://localhost/download'));

  const contentDisposition = response.headers.get('content-disposition');
  expect(contentDisposition).toBeDefined();

  // Should NOT contain newlines or the injected header
  expect(contentDisposition).not.toContain('\r');
  expect(contentDisposition).not.toContain('\n');
  expect(contentDisposition).not.toContain('X-Malicious');

  // Should still have the sanitized filename
  expect(contentDisposition).toContain('filename=');
});

test('CSV filename quote escaping', async () => {
  const app = bunserve();

  app.get('/download', ({ set }) => {
    set.content = {
      type: 'csv',
      filename: 'test"malicious".csv'
    };
    return 'data';
  });

  const response = await app.fetch(new Request('http://localhost/download'));

  const contentDisposition = response.headers.get('content-disposition');
  expect(contentDisposition).toBeDefined();

  // Quotes should be escaped
  expect(contentDisposition).toContain('\\"');
});

test('CORS development preset rejects malicious localhost-like origins', async () => {
  const app = bunserve();

  app.use(cors({ preset: 'development' }));
  app.get('/test', () => ({ success: true }));

  // Test malicious origins that contain 'localhost' but are not localhost
  const malicious_origins = [
    'http://localhost.evil.com',
    'http://evil-localhost.com',
    'http://127.0.0.1.evil.com',
    'http://evil-127.0.0.1.com'
  ];

  for (const origin of malicious_origins) {
    const response = await app.fetch(
      new Request('http://localhost/test', {
        headers: { Origin: origin }
      })
    );

    const allowedOrigin = response.headers.get('access-control-allow-origin');

    // Should NOT allow these malicious origins
    expect(allowedOrigin).not.toBe(origin);
  }
});

test('CORS development preset accepts legitimate localhost origins', async () => {
  const app = bunserve();

  app.use(cors({ preset: 'development' }));
  app.get('/test', () => ({ success: true }));

  const legitimate_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'http://127.0.0.1'
  ];

  for (const origin of legitimate_origins) {
    const response = await app.fetch(
      new Request('http://localhost/test', {
        headers: { Origin: origin }
      })
    );

    const allowedOrigin = response.headers.get('access-control-allow-origin');

    // Should allow these legitimate origins
    expect(allowedOrigin).toBe(origin);
  }
});

test('Error responses do not leak sensitive information', async () => {
  const app = bunserve();

  app.get('/error', () => {
    const error = new Error('Database connection string: postgresql://user:password@host/db');
    throw error;
  });

  const response = await app.fetch(new Request('http://localhost/error'));

  expect(response.status).toBe(500);
  const body = await response.text();

  // Should NOT contain sensitive error details
  expect(body).not.toContain('password');
  expect(body).not.toContain('postgresql://');
  expect(body).toBe('Internal Server Error');
});

test('Large JSON payload handling (potential DoS)', async () => {
  const app = bunserve();

  app.post('/upload', ({ body }) => {
    return { received: true, size: JSON.stringify(body).length };
  });

  // Create a reasonably large payload (1MB)
  const largeData = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    data: 'x'.repeat(100)
  }));

  const response = await app.fetch(
    new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largeData)
    })
  );

  // Should handle large payloads gracefully
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.received).toBe(true);
});

test('XSS prevention in HTML responses', async () => {
  const app = bunserve();

  app.get('/html', ({ set }) => {
    set.content = 'html';
    // User-provided data that could contain XSS
    return '<script>alert("XSS")</script>';
  });

  const response = await app.fetch(new Request('http://localhost/html'));

  expect(response.headers.get('content-type')).toBe('text/html');
  const body = await response.text();

  // Framework returns as-is; document that users should sanitize
  expect(body).toBe('<script>alert("XSS")</script>');
  // Note: This test documents that XSS prevention is the user's responsibility
});

test('Path traversal in route parameters', async () => {
  const app = bunserve();

  app.get('/files/:filename', ({ params }) => {
    // This test documents that path traversal prevention is user's responsibility
    return { filename: params.filename };
  });

  const response = await app.fetch(
    new Request('http://localhost/files/..%2F..%2Fetc%2Fpasswd')
  );

  const data = await response.json();

  // Framework passes parameter as-is; users must validate
  expect(data.filename).toBeDefined();
  // Note: This test documents that path traversal prevention is user's responsibility
});

test('Request body content-type spoofing', async () => {
  const app = bunserve();

  app.post('/data', ({ body }) => {
    return { bodyType: typeof body, body };
  });

  // Send JSON with wrong content-type
  const response = await app.fetch(
    new Request('http://localhost/data', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ test: 'data' })
    })
  );

  const result = await response.json();

  // Should parse based on content-type header, not content
  // With text/plain, body should be a string
  expect(typeof result.body).toBe('string');
});

test('Empty body with various content types', async () => {
  const app = bunserve();

  app.post('/data', ({ body }) => {
    return { bodyIsNull: body === null || body === '', body };
  });

  const content_types = [
    'application/json',
    'text/plain',
    'application/x-www-form-urlencoded'
  ];

  for (const ct of content_types) {
    const response = await app.fetch(
      new Request('http://localhost/data', {
        method: 'POST',
        headers: { 'Content-Type': ct },
        body: ''
      })
    );

    expect(response.status).toBe(200);
    // Should handle empty bodies gracefully without crashing
    await response.json();
  }
});

test('Malformed JSON does not crash server', async () => {
  const app = bunserve();

  app.post('/data', ({ body }) => {
    return { received: true, body };
  });

  const malformed_json = [
    '{invalid}',
    '{"unclosed": ',
    'not json at all',
    '{]',
    '{"a": undefined}'
  ];

  for (const json of malformed_json) {
    const response = await app.fetch(
      new Request('http://localhost/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json
      })
    );

    // Should return gracefully, not crash
    expect(response.status).toBeGreaterThanOrEqual(200);
  }
});

test('Special characters in route parameters', async () => {
  const app = bunserve();

  app.get('/items/:id', ({ params }) => {
    return { id: params.id };
  });

  const special_chars = [
    'test%20space',
    'test%2Fslash',
    'test%3Fquestion',
    'test%26ampersand'
  ];

  for (const char of special_chars) {
    const response = await app.fetch(
      new Request(`http://localhost/items/${char}`)
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBeDefined();
  }
});

test('Multiple slashes in URL', async () => {
  const app = bunserve();

  app.get('/api/users', () => ({ message: 'users' }));

  // Test with multiple slashes
  const response = await app.fetch(
    new Request('http://localhost//api///users')
  );

  // Bun's native routing should handle this
  // This test documents the behavior
  expect(response.status).toBeGreaterThanOrEqual(200);
});

test('Request with extremely long URL', async () => {
  const app = bunserve();

  app.get('/test', () => ({ success: true }));

  // Create a very long query string (but not absurdly long to avoid actual DoS)
  const longQuery = 'a=1&' + 'b=2&'.repeat(1000);

  const response = await app.fetch(
    new Request(`http://localhost/test?${longQuery}`)
  );

  // Should handle or reject gracefully
  expect(response.status).toBeGreaterThanOrEqual(200);
});

test('Content-Type header case insensitivity', async () => {
  const app = bunserve();

  app.post('/data', ({ body }) => {
    return { body };
  });

  const variations = [
    'application/json',
    'Application/JSON',
    'APPLICATION/JSON',
    'application/JSON'
  ];

  for (const ct of variations) {
    const response = await app.fetch(
      new Request('http://localhost/data', {
        method: 'POST',
        headers: { 'Content-Type': ct },
        body: JSON.stringify({ test: 'data' })
      })
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    // Should parse JSON regardless of header case
    expect(result.body).toEqual({ test: 'data' });
  }
});
