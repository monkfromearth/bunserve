import { expect, test } from 'bun:test';
import {
  cors,
  create_health_check,
  create_router,
  create_server,
  error_handler,
  HttpError,
  logger
} from '../src/index';

test('error handler middleware - HttpError', async () => {
  const router = create_router();

  // Add error handler
  router.use(error_handler());

  // Route that throws an HttpError
  router.get('/not-found', () => {
    throw HttpError.not_found('Resource not found');
  });

  const server = create_server({ router });
  const response = await server.fetch(
    new Request('http://localhost/not-found')
  );

  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.error).toBe('Resource not found');
  expect(data.status).toBe(404);
});

test('error handler middleware - generic error', async () => {
  const router = create_router();

  router.use(error_handler({ include_stack: false }));

  router.get('/error', () => {
    throw new Error('Something went wrong');
  });

  const server = create_server({ router });
  const response = await server.fetch(new Request('http://localhost/error'));

  expect(response.status).toBe(500);
  const data = await response.json();
  expect(data.error).toBe('Something went wrong');
});

test('HttpError factory methods', () => {
  const bad_request = HttpError.bad_request('Invalid input', {
    field: 'email'
  });
  expect(bad_request.status).toBe(400);
  expect(bad_request.message).toBe('Invalid input');
  expect(bad_request.details).toEqual({ field: 'email' });

  const unauthorized = HttpError.unauthorized();
  expect(unauthorized.status).toBe(401);
  expect(unauthorized.message).toBe('Unauthorized');

  const forbidden = HttpError.forbidden();
  expect(forbidden.status).toBe(403);

  const not_found = HttpError.not_found();
  expect(not_found.status).toBe(404);

  const conflict = HttpError.conflict('Resource exists');
  expect(conflict.status).toBe(409);

  const internal = HttpError.internal();
  expect(internal.status).toBe(500);
});

test('CORS middleware - allow all', async () => {
  const router = create_router();

  router.use(cors());

  router.get('/api/data', () => ({ data: 'test' }));

  const server = create_server({ router });
  const response = await server.fetch(new Request('http://localhost/api/data'));

  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
});

test('CORS middleware - specific origins', async () => {
  const router = create_router();

  router.use(
    cors({
      origin: ['https://example.com', 'https://app.example.com'],
      credentials: true
    })
  );

  router.get('/api/data', () => ({ data: 'test' }));

  const server = create_server({ router });
  const response = await server.fetch(
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
  const router = create_router();

  router.use(
    cors({
      methods: ['GET', 'POST'],
      max_age: 3600
    })
  );

  router.options('/api/data', () => ({ data: 'test' }));

  const server = create_server({ router });
  const response = await server.fetch(
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
  const router = create_router();
  const logs: string[] = [];

  router.use(
    logger({
      format: 'common',
      log: (message) => logs.push(message)
    })
  );

  router.get('/test', () => ({ success: true }));

  const server = create_server({ router });
  await server.fetch(new Request('http://localhost/test'));

  expect(logs.length).toBe(1);
  expect(logs[0]).toContain('GET');
  expect(logs[0]).toContain('/test');
  expect(logs[0]).toContain('200');
});

test('logger middleware - skip paths', async () => {
  const router = create_router();
  const logs: string[] = [];

  router.use(
    logger({
      log: (message) => logs.push(message),
      skip: (path) => path === '/health'
    })
  );

  router.get('/health', () => ({ status: 'ok' }));
  router.get('/api/data', () => ({ data: 'test' }));

  const server = create_server({ router });

  await server.fetch(new Request('http://localhost/health'));
  expect(logs.length).toBe(0);

  await server.fetch(new Request('http://localhost/api/data'));
  expect(logs.length).toBe(1);
});

test('health check - simple', async () => {
  const router = create_router();

  router.get('/health', create_health_check());

  const server = create_server({ router });
  const response = await server.fetch(new Request('http://localhost/health'));

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.status).toBe('healthy');
  expect(data.timestamp).toBeDefined();
  expect(data.uptime).toBeGreaterThan(0);
});

test('health check - with custom checks', async () => {
  const router = create_router();

  router.get(
    '/health',
    create_health_check({
      checks: {
        database: async () => true,
        cache: () => false
      }
    })
  );

  const server = create_server({ router });
  const response = await server.fetch(new Request('http://localhost/health'));

  const data = await response.json();
  expect(data.status).toBe('degraded');
  expect(data.checks.database).toBe(true);
  expect(data.checks.cache).toBe(false);
});

test('combined middleware', async () => {
  const router = create_router();

  // Add multiple middleware
  router.use(cors());
  router.use(error_handler());

  router.get('/api/success', () => ({ success: true }));
  router.get('/api/error', () => {
    throw HttpError.bad_request('Invalid request');
  });

  const server = create_server({ router });

  // Test success case
  const response1 = await server.fetch(
    new Request('http://localhost/api/success')
  );
  expect(response1.status).toBe(200);
  expect(response1.headers.get('Access-Control-Allow-Origin')).toBe('*');

  // Test error case
  const response2 = await server.fetch(
    new Request('http://localhost/api/error')
  );
  expect(response2.status).toBe(400);
  const data = await response2.json();
  expect(data.error).toBe('Invalid request');
});
