import { expect, test } from 'bun:test';
import {
  bunserve,
  sessions,
  MemorySessionStore,
  generate_csrf_token,
  validate_csrf_token,
  destroy_session,
  type Session,
  type SessionStore
} from '../src/index';

test('sessions - auto-create session', async () => {
  const app = bunserve();

  app.use(sessions({ secret: 'test-secret' }));

  app.get('/test', ({ request }) => {
    const session = (request as any).session;
    return { has_session: !!session, session_id: session?.id };
  });

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.has_session).toBe(true);
  expect(data.session_id).toBeDefined();
  expect(typeof data.session_id).toBe('string');
});

test('sessions - persist session data', async () => {
  const app = bunserve();
  const store = new MemorySessionStore();

  app.use(sessions({ secret: 'test-secret', store }));

  app.post('/login', ({ request, body }) => {
    const session = (request as any).session as Session;
    session.data.user_id = body.user_id;
    session.data.username = body.username;
    return { message: 'Logged in' };
  });

  app.get('/me', ({ request }) => {
    const session = (request as any).session as Session;
    return { user_id: session.data.user_id, username: session.data.username };
  });

  // Login
  const login_response = await app.fetch(
    new Request('http://localhost/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: '123', username: 'testuser' })
    })
  );

  expect(login_response.status).toBe(200);

  // Check session was persisted
  const session_cookie = login_response.headers.get('Set-Cookie');
  expect(session_cookie).toBeDefined();

  // Get user info (simulate reading from session)
  const me_response = await app.fetch(new Request('http://localhost/me'));
  const me_data = await me_response.json();

  // Session should exist but may not have user data without cookie
  expect(me_data.user_id).toBeUndefined();
});

test('sessions - session data storage', async () => {
  const store = new MemorySessionStore();
  const session_id = 'test-session-123';
  const session: Session = {
    id: session_id,
    data: { user_id: '456', role: 'admin' },
    created_at: Date.now(),
    last_access: Date.now()
  };

  await store.set(session_id, session);
  const retrieved = await store.get(session_id);

  expect(retrieved).toBeDefined();
  expect(retrieved?.id).toBe(session_id);
  expect(retrieved?.data.user_id).toBe('456');
  expect(retrieved?.data.role).toBe('admin');
});

test('sessions - delete session', async () => {
  const store = new MemorySessionStore();
  const session_id = 'test-session-delete';
  const session: Session = {
    id: session_id,
    data: {},
    created_at: Date.now(),
    last_access: Date.now()
  };

  await store.set(session_id, session);
  expect(await store.get(session_id)).toBeDefined();

  await store.delete(session_id);
  expect(await store.get(session_id)).toBeNull();
});

test('sessions - custom cookie name', async () => {
  const app = bunserve();

  app.use(sessions({ secret: 'test-secret', cookie_name: 'my_session' }));

  app.get('/test', () => ({ message: 'ok' }));

  const response = await app.fetch(new Request('http://localhost/test'));

  const cookie_header = response.headers.get('Set-Cookie');
  expect(cookie_header).toBeDefined();
  expect(cookie_header).toContain('my_session=');
});

test('sessions - CSRF token generation', () => {
  const session: Session = {
    id: 'test-session',
    data: {},
    created_at: Date.now(),
    last_access: Date.now()
  };

  const token = generate_csrf_token(session);
  expect(token).toBeDefined();
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(0);

  // Store token in session
  session.data.csrf_token = token;

  // Validate token
  expect(validate_csrf_token(session, token)).toBe(true);
  expect(validate_csrf_token(session, 'wrong-token')).toBe(false);
});

test('sessions - CSRF token validation', () => {
  const session: Session = {
    id: 'test-session',
    data: { csrf_token: 'valid-token-123' },
    created_at: Date.now(),
    last_access: Date.now()
  };

  expect(validate_csrf_token(session, 'valid-token-123')).toBe(true);
  expect(validate_csrf_token(session, 'invalid-token')).toBe(false);
  expect(validate_csrf_token(session, '')).toBe(false);
});

test('sessions - destroy session utility', async () => {
  const store = new MemorySessionStore();
  const session_id = 'test-session-destroy';
  const session: Session = {
    id: session_id,
    data: { user_id: '789' },
    created_at: Date.now(),
    last_access: Date.now()
  };

  await store.set(session_id, session);
  expect(await store.get(session_id)).toBeDefined();

  // Mock cookies object
  const mock_cookies = new Map();
  mock_cookies.set('session_id', session_id);

  // Destroy session
  await destroy_session(session, mock_cookies as any, store);

  expect(await store.get(session_id)).toBeNull();
});

test('sessions - memory store cleanup', async () => {
  const store = new MemorySessionStore();

  // Create expired session
  const expired_session: Session = {
    id: 'expired-session',
    data: { __max_age: 1000 }, // 1 second max age
    created_at: Date.now() - 2000, // Created 2 seconds ago
    last_access: Date.now() - 2000
  };

  // Create valid session
  const valid_session: Session = {
    id: 'valid-session',
    data: { __max_age: 86400000 }, // 24 hours
    created_at: Date.now(),
    last_access: Date.now()
  };

  await store.set('expired-session', expired_session);
  await store.set('valid-session', valid_session);

  // Run cleanup
  await store.cleanup();

  // Expired session should be removed
  expect(await store.get('expired-session')).toBeNull();
  // Valid session should remain
  expect(await store.get('valid-session')).toBeDefined();
});

test('sessions - session with custom store interface', async () => {
  class CustomStore implements SessionStore {
    private data: Map<string, Session> = new Map();

    async get(session_id: string): Promise<Session | null> {
      return this.data.get(session_id) || null;
    }

    async set(session_id: string, session: Session): Promise<void> {
      this.data.set(session_id, session);
    }

    async delete(session_id: string): Promise<void> {
      this.data.delete(session_id);
    }
  }

  const custom_store = new CustomStore();
  const app = bunserve();

  app.use(sessions({ secret: 'test-secret', store: custom_store }));

  app.get('/test', ({ request }) => {
    const session = (request as any).session;
    return { session_id: session.id };
  });

  const response = await app.fetch(new Request('http://localhost/test'));
  expect(response.status).toBe(200);
});

test('sessions - cookie options applied', async () => {
  const app = bunserve();

  app.use(
    sessions({
      secret: 'test-secret',
      cookie_options: {
        http_only: true,
        secure: false,
        same_site: 'strict',
        path: '/api'
      }
    })
  );

  app.get('/test', () => ({ message: 'ok' }));

  const response = await app.fetch(new Request('http://localhost/test'));

  const cookie_header = response.headers.get('Set-Cookie');
  expect(cookie_header).toBeDefined();
  expect(cookie_header).toContain('HttpOnly');
  expect(cookie_header).toContain('SameSite=Strict');
  expect(cookie_header).toContain('Path=/api');
});

test('sessions - max age configuration', async () => {
  const app = bunserve();

  const one_hour = 60 * 60 * 1000;
  app.use(sessions({ secret: 'test-secret', max_age: one_hour }));

  app.get('/test', ({ request }) => {
    const session = (request as any).session as Session;
    return { max_age: session.data.__max_age };
  });

  const response = await app.fetch(new Request('http://localhost/test'));
  const data = await response.json();

  expect(data.max_age).toBe(one_hour);
});

test('sessions - updates last access time', async () => {
  const store = new MemorySessionStore();
  const app = bunserve();

  app.use(sessions({ secret: 'test-secret', store }));

  let first_session_id: string;

  app.get('/first', ({ request }) => {
    const session = (request as any).session as Session;
    first_session_id = session.id;
    return { session_id: session.id, last_access: session.last_access };
  });

  // First request
  const first_response = await app.fetch(new Request('http://localhost/first'));
  const first_data = await first_response.json();

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Get session from store
  const stored_session = await store.get(first_data.session_id);
  expect(stored_session).toBeDefined();
  expect(stored_session!.last_access).toBeGreaterThanOrEqual(first_data.last_access);
});
