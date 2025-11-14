import { expect, test } from 'bun:test';
import { Context } from '@theinternetfolks/context';
import { create_router, create_server } from '../src/index';

test('basic router functionality', async () => {
  const router = create_router();

  // Add a simple route
  router.get('/hello', () => 'Hello World');

  // Create a test server
  const server = create_server({ router });

  // Test the route
  const response = await server.fetch(new Request('http://localhost/hello'));

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Hello World');
});

test('route with parameters', async () => {
  const router = create_router();

  router.get('/users/:id', ({ params }) => {
    return { user_id: params.id, name: 'John Doe' };
  });

  const server = create_server({ router });

  const response = await server.fetch(
    new Request('http://localhost/users/123')
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.user_id).toBe('123');
  expect(data.name).toBe('John Doe');
});

test('JSON response', async () => {
  const router = create_router();

  router.get('/api/data', () => {
    return { success: true, data: [1, 2, 3] };
  });

  const server = create_server({ router });

  const response = await server.fetch(new Request('http://localhost/api/data'));

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data).toEqual([1, 2, 3]);
});

test('context integration', async () => {
  const router = create_router();

  router.get('/context', () => {
    const context = Context.get<{ request_id: string; start_time: number }>();
    return {
      request_id: context.request_id,
      has_start_time: typeof context.start_time === 'number'
    };
  });

  const server = create_server({ router });

  const response = await server.fetch(new Request('http://localhost/context'));

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.request_id).toBeDefined();
  expect(data.has_start_time).toBe(true);
});

test('POST request with body', async () => {
  const router = create_router();

  router.post('/api/users', async ({ body }) => {
    return {
      received: true,
      user: body,
      id: 'new-user-id'
    };
  });

  const server = create_server({ router });

  const request_body = JSON.stringify({
    name: 'Alice',
    email: 'alice@example.com'
  });
  const response = await server.fetch(
    new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: request_body
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.received).toBe(true);
  expect(data.user.name).toBe('Alice');
  expect(data.user.email).toBe('alice@example.com');
});

test('404 for unknown routes', async () => {
  const router = create_router();

  router.get('/known', () => 'known route');

  const server = create_server({ router });

  const response = await server.fetch(new Request('http://localhost/unknown'));

  expect(response.status).toBe(404);
});

test('response helpers', async () => {
  const router = create_router();

  router.get('/text', ({ set }) => {
    set.content = 'text';
    return 'Plain text response';
  });

  router.get('/html', ({ set }) => {
    set.content = 'html';
    return '<h1>Hello World</h1>';
  });

  router.get('/status', ({ set }) => {
    set.status = 201;
    return { created: true };
  });

  const server = create_server({ router });

  // Test text response
  const text_response = await server.fetch(
    new Request('http://localhost/text')
  );
  expect(text_response.status).toBe(200);
  expect(text_response.headers.get('content-type')).toBe('text/plain');

  // Test HTML response
  const html_response = await server.fetch(
    new Request('http://localhost/html')
  );
  expect(html_response.status).toBe(200);
  expect(html_response.headers.get('content-type')).toBe('text/html');

  // Test custom status
  const status_response = await server.fetch(
    new Request('http://localhost/status')
  );
  expect(status_response.status).toBe(201);
});

test('middleware functionality', async () => {
  const router = create_router();

  // Add global middleware
  let middleware_executed = false;
  router.use(async (_ctx, next) => {
    middleware_executed = true;
    await next();
  });

  // Add route-specific middleware
  let route_middleware_executed = false;
  const route_middleware = async (_ctx, next) => {
    route_middleware_executed = true;
    await next();
  };

  router.get('/middleware', [route_middleware], () => {
    return 'middleware test';
  });

  const server = create_server({ router });

  const response = await server.fetch(
    new Request('http://localhost/middleware')
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('middleware test');
  expect(middleware_executed).toBe(true);
  expect(route_middleware_executed).toBe(true);
});

test('wildcard routes', async () => {
  const router = create_router();

  // Wildcard route for all /api/* paths
  router.get('/api/*', ({ params }) => {
    return {
      matched: 'wildcard',
      path: params['*']
    };
  });

  // Specific route that should match before wildcard
  router.get('/api/users', () => {
    return { matched: 'specific' };
  });

  const server = create_server({ router });

  // Test wildcard match
  const response1 = await server.fetch(
    new Request('http://localhost/api/posts')
  );
  expect(response1.status).toBe(200);
  const data1 = await response1.json();
  expect(data1.matched).toBe('wildcard');
  expect(data1.path).toBe('posts');

  // Test nested wildcard match
  const response2 = await server.fetch(
    new Request('http://localhost/api/posts/123')
  );
  expect(response2.status).toBe(200);
  const data2 = await response2.json();
  expect(data2.matched).toBe('wildcard');
  expect(data2.path).toBe('posts/123');
});

test('query parameters', async () => {
  const router = create_router();

  router.get('/search', ({ query }) => {
    return {
      query: query.q,
      page: query.page || '1'
    };
  });

  const server = create_server({ router });

  const response = await server.fetch(
    new Request('http://localhost/search?q=test&page=2')
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.query).toBe('test');
  expect(data.page).toBe('2');
});
