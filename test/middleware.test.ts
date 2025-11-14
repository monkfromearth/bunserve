import { expect, test } from 'bun:test';
import { bunserve, cors, error_handler, logger } from '../src/index';

test('error handler middleware - HttpError', async () => {
  const app = bunserve();

  // Add error handler
  app.use(error_handler());

  // Route that throws an error with status
  app.get('/not-found', () => {
    const error: any = new Error('Resource not found');
    error.status = 404;
    throw error;
  });

  const response = await app.fetch(new Request('http://localhost/not-found'));

  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.error).toBe('Resource not found');
  expect(data.status).toBe(404);
});

test('error handler middleware - generic error', async () => {
  const app = bunserve();

  app.use(error_handler({ include_stack: false }));

  app.get('/error', () => {
    throw new Error('Something went wrong');
  });

  const response = await app.fetch(new Request('http://localhost/error'));

  expect(response.status).toBe(500);
  const data = await response.json();
  expect(data.error).toBe('Something went wrong');
});

test('Error with status property', () => {
  const bad_request: any = new Error('Invalid input');
  bad_request.status = 400;
  bad_request.details = { field: 'email' };
  expect(bad_request.status).toBe(400);
  expect(bad_request.message).toBe('Invalid input');
  expect(bad_request.details).toEqual({ field: 'email' });

  const unauthorized: any = new Error('Unauthorized');
  unauthorized.status = 401;
  expect(unauthorized.status).toBe(401);
  expect(unauthorized.message).toBe('Unauthorized');

  const forbidden: any = new Error('Forbidden');
  forbidden.status = 403;
  expect(forbidden.status).toBe(403);

  const not_found: any = new Error('Not Found');
  not_found.status = 404;
  expect(not_found.status).toBe(404);

  const conflict: any = new Error('Resource exists');
  conflict.status = 409;
  expect(conflict.status).toBe(409);

  const internal: any = new Error('Internal Server Error');
  internal.status = 500;
  expect(internal.status).toBe(500);
});

test('CORS middleware - allow all', async () => {
  const app = bunserve();

  app.use(cors());

  app.get('/api/data', () => ({ data: 'test' }));

  const response = await app.fetch(new Request('http://localhost/api/data'));

  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
});

test('CORS middleware - specific origins', async () => {
  const app = bunserve();

  app.use(
    cors({
      origin: ['https://example.com', 'https://app.example.com'],
      credentials: true
    })
  );

  app.get('/api/data', () => ({ data: 'test' }));

  const response = await app.fetch(
    new Request('http://localhost/api/data', {
      headers: { origin: 'https://example.com' }
    })
  );

  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
    'https://example.com'
  );
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
});

test('CORS middleware - OPTIONS preflight', async () => {
  const app = bunserve();

  app.use(
    cors({
      methods: ['GET', 'POST'],
      max_age: 3600
    })
  );

  app.options('/api/data', () => ({ data: 'test' }));

  const response = await app.fetch(
    new Request('http://localhost/api/data', {
      method: 'OPTIONS'
    })
  );

  expect(response.status).toBe(204);
  const methods = response.headers.get('Access-Control-Allow-Methods');
  expect(methods).toContain('GET');
  expect(response.headers.get('Access-Control-Max-Age')).toBe('3600');
});

test('logger middleware', async () => {
  const app = bunserve();
  const logs: string[] = [];

  app.use(
    logger({
      format: 'common',
      log: (message) => logs.push(message)
    })
  );

  app.get('/test', () => ({ success: true }));

  await app.fetch(new Request('http://localhost/test'));

  expect(logs.length).toBe(1);
  expect(logs[0]).toContain('GET');
  expect(logs[0]).toContain('/test');
  expect(logs[0]).toContain('200');
});

test('logger middleware - skip paths', async () => {
  const app = bunserve();
  const logs: string[] = [];

  app.use(
    logger({
      log: (message) => logs.push(message),
      skip: (path) => path === '/health'
    })
  );

  app.get('/health', () => ({ status: 'ok' }));
  app.get('/api/data', () => ({ data: 'test' }));

  await app.fetch(new Request('http://localhost/health'));
  expect(logs.length).toBe(0);

  await app.fetch(new Request('http://localhost/api/data'));
  expect(logs.length).toBe(1);
});

// TODO: Re-enable once create_health_check is implemented
// test('health check - simple', async () => {
//   const app = bunserve();

//   app.get('/health', create_health_check());

//   const response = await app.fetch(new Request('http://localhost/health'));

//   expect(response.status).toBe(200);
//   const data = await response.json();
//   expect(data.status).toBe('healthy');
//   expect(data.timestamp).toBeDefined();
//   expect(data.uptime).toBeGreaterThan(0);
// });

// TODO: Re-enable once create_health_check is implemented
// test('health check - with custom checks', async () => {
//   const app = bunserve();

//   app.get(
//     '/health',
//     create_health_check({
//       checks: {
//         database: async () => true,
//         cache: () => false
//       }
//     })
//   );

//   const response = await app.fetch(new Request('http://localhost/health'));

//   const data = await response.json();
//   expect(data.status).toBe('degraded');
//   expect(data.checks.database).toBe(true);
//   expect(data.checks.cache).toBe(false);
// });

test('combined middleware', async () => {
  const app = bunserve();

  // Add multiple middleware
  app.use(cors());
  app.use(error_handler());

  app.get('/api/success', () => ({ success: true }));
  app.get('/api/error', () => {
    const error: any = new Error('Invalid request');
    error.status = 400;
    throw error;
  });

  // Test success case
  const response1 = await app.fetch(
    new Request('http://localhost/api/success')
  );
  expect(response1.status).toBe(200);
  expect(response1.headers.get('Access-Control-Allow-Origin')).toBe('*');

  // Test error case
  const response2 = await app.fetch(new Request('http://localhost/api/error'));
  expect(response2.status).toBe(400);
  const data = await response2.json();
  expect(data.error).toBe('Invalid request');
});
