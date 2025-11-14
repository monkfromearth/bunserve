import { expect, test } from 'bun:test';
import { bunserve, Context, cors, error_handler } from '../src';

// Test that all examples from the docs actually work

test('Quick Start example from README', async () => {
  const app = bunserve();

  app.get('/hello', () => 'Hello World!');
  app.get('/users/:id', ({ params }) => ({ id: params.id }));

  const response1 = await app.fetch(new Request('http://localhost/hello'));
  expect(response1.status).toBe(200);
  expect(await response1.text()).toBe('Hello World!');

  const response2 = await app.fetch(new Request('http://localhost/users/123'));
  expect(response2.status).toBe(200);
  const data = await response2.json();
  expect(data.id).toBe('123');
});

test('Error handler example from docs', async () => {
  const app = bunserve();

  app.use(error_handler());

  app.get('/users/:id', ({ params }) => {
    const users = [{ id: '1', name: 'John' }];
    const user = users.find((u) => u.id === params.id);
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  });

  const response = await app.fetch(new Request('http://localhost/users/999'));
  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.error).toBe('User not found');
});

test('CORS middleware example from docs', async () => {
  const app = bunserve();

  app.use(
    cors({
      origin: ['https://example.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowed_headers: ['Content-Type', 'Authorization']
    })
  );

  app.get('/test', () => 'ok');

  const response = await app.fetch(
    new Request('http://localhost/test', {
      headers: { Origin: 'https://example.com' }
    })
  );

  expect(response.status).toBe(200);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
    'https://example.com'
  );
});

test('Route parameters example from docs', async () => {
  const app = bunserve();

  app.get('/users/:id/posts/:post_id', ({ params }) => {
    return {
      user_id: params.id,
      post_id: params.post_id
    };
  });

  const response = await app.fetch(
    new Request('http://localhost/users/123/posts/456')
  );

  const data = await response.json();
  expect(data.user_id).toBe('123');
  expect(data.post_id).toBe('456');
});

test('Response configuration example from docs', async () => {
  const app = bunserve();

  app.get('/api/data', ({ set }) => {
    set.status = 201;
    set.headers['X-Custom-Header'] = 'value';
    set.cache = '1h';

    return { created: true };
  });

  const response = await app.fetch(new Request('http://localhost/api/data'));

  expect(response.status).toBe(201);
  expect(response.headers.get('X-Custom-Header')).toBe('value');
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
});

test('Middleware example from docs', async () => {
  const app = bunserve();

  let logged = false;

  app.use(async ({ _request }, next) => {
    logged = true;
    await next();
  });

  app.get('/test', () => 'ok');

  await app.fetch(new Request('http://localhost/test'));

  expect(logged).toBe(true);
});

// TODO: Re-enable once simple_health_check is implemented
// test('Health check example from docs', async () => {
//   const app = bunserve();

//   app.get('/health', simple_health_check());

//   const response = await app.fetch(new Request('http://localhost/health'));

//   expect(response.status).toBe(200);
//   const data = await response.json();
//   expect(data.status).toBe('healthy');
//   expect(data.timestamp).toBeDefined();
//   expect(data.uptime).toBeGreaterThanOrEqual(0);
// });

// TODO: Re-enable once create_health_check is implemented
// test('Advanced health check example from docs', async () => {
//   const app = bunserve();

//   app.get(
//     '/health/full',
//     create_health_check({
//       checks: {
//         database: async () => {
//           // Simulate database check
//           return true;
//         },
//         redis: async () => {
//           // Simulate Redis check
//           return true;
//         }
//       },
//       include_system_info: true
//     })
//   );

//   const response = await app.fetch(
//     new Request('http://localhost/health/full')
//   );

//   expect(response.status).toBe(200);
//   const data = await response.json();
//   expect(data.status).toBe('healthy');
//   expect(data.checks?.database).toBe(true);
//   expect(data.checks?.redis).toBe(true);
//   expect(data.system).toBeDefined();
// });

test('Context example from docs', async () => {
  const app = bunserve();

  app.use(async (_ctx, next) => {
    Context.set({
      request_id: '12345',
      start_time: Date.now()
    });
    await next();
  });

  app.get('/context', () => {
    const context = Context.get<{
      request_id: string;
      start_time: number;
    }>();

    return {
      request_id: context?.request_id,
      has_start_time: !!context?.start_time
    };
  });

  const response = await app.fetch(new Request('http://localhost/context'));

  const data = await response.json();
  expect(data.request_id).toBe('12345');
  expect(data.has_start_time).toBe(true);
});

test('Cookie example from docs', async () => {
  const app = bunserve();

  app.post('/login', ({ cookies }) => {
    cookies.set('session_id', 'abc123', {
      httpOnly: true,
      secure: true,
      maxAge: 3600,
      path: '/'
    });

    return { success: true };
  });

  app.get('/profile', ({ cookies }) => {
    const session_id = cookies.get('session_id');
    return { session_id };
  });

  const response = await app.fetch(
    new Request('http://localhost/login', { method: 'POST' })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
});

test('Wildcard route example from docs', async () => {
  const app = bunserve();

  app.get('/api/admin/*', ({ params }) => {
    const resource = params['*'];
    return { admin_resource: resource };
  });

  const response = await app.fetch(
    new Request('http://localhost/api/admin/users')
  );

  const data = await response.json();
  expect(data.admin_resource).toBe('users');
});

test('Query parameters example from docs', async () => {
  const app = bunserve();

  app.get('/search', ({ query }) => {
    const search_term = query.q || '';
    const page = parseInt(query.page || '1', 10);

    return {
      query: search_term,
      page,
      results: []
    };
  });

  const response = await app.fetch(
    new Request('http://localhost/search?q=hello&page=2')
  );

  const data = await response.json();
  expect(data.query).toBe('hello');
  expect(data.page).toBe(2);
});

test('All HTTP methods example from docs', async () => {
  const app = bunserve();

  app.get('/resource', () => ({ method: 'GET' }));
  app.post('/resource', () => ({ method: 'POST' }));
  app.put('/resource', () => ({ method: 'PUT' }));
  app.patch('/resource', () => ({ method: 'PATCH' }));
  app.delete('/resource', () => ({ method: 'DELETE' }));

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  for (const method of methods) {
    const response = await app.fetch(
      new Request('http://localhost/resource', { method })
    );
    const data = await response.json();
    expect(data.method).toBe(method);
  }
});

test('Content type example from docs', async () => {
  const app = bunserve();

  app.get('/json', ({ set }) => {
    set.content = 'json';
    return { message: 'JSON response' };
  });

  app.get('/html', ({ set }) => {
    set.content = 'html';
    return '<h1>Hello World</h1>';
  });

  app.get('/text', ({ set }) => {
    set.content = 'text';
    return 'Plain text response';
  });

  const jsonRes = await app.fetch(new Request('http://localhost/json'));
  expect(jsonRes.headers.get('Content-Type')).toContain('application/json');

  const htmlRes = await app.fetch(new Request('http://localhost/html'));
  expect(htmlRes.headers.get('Content-Type')).toContain('text/html');

  const textRes = await app.fetch(new Request('http://localhost/text'));
  expect(textRes.headers.get('Content-Type')).toContain('text/plain');
});

test('Route-specific middleware example from docs', async () => {
  const app = bunserve();

  const requireAuth = async ({ request, set }, next) => {
    const token = request.headers.get('authorization');
    if (!token) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    await next();
  };

  app.get('/public', () => 'Public data');
  app.get('/private', [requireAuth], () => 'Private data');

  // Public route works without auth
  const publicRes = await app.fetch(new Request('http://localhost/public'));
  expect(publicRes.status).toBe(200);

  // Private route requires auth
  const privateRes = await app.fetch(new Request('http://localhost/private'));
  expect(privateRes.status).toBe(401);

  // Private route works with auth
  const authedRes = await app.fetch(
    new Request('http://localhost/private', {
      headers: { authorization: 'Bearer token' }
    })
  );
  expect(authedRes.status).toBe(200);
});
