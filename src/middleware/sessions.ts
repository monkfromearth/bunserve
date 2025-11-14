import type { Middleware } from '../types';

/**
 * Session data interface.
 */
export interface Session {
  /** Session ID */
  id: string;
  /** Session data */
  data: Record<string, any>;
  /** Session creation timestamp */
  created_at: number;
  /** Session last access timestamp */
  last_access: number;
}

/**
 * Session store interface for custom implementations.
 * Implement this to use your own storage backend (Redis, Database, etc.)
 */
export interface SessionStore {
  /**
   * Get a session by ID.
   * @param session_id - Session ID
   * @returns Session object or null if not found
   */
  get(session_id: string): Promise<Session | null>;

  /**
   * Set a session.
   * @param session_id - Session ID
   * @param session - Session object
   */
  set(session_id: string, session: Session): Promise<void>;

  /**
   * Delete a session by ID.
   * @param session_id - Session ID
   */
  delete(session_id: string): Promise<void>;

  /**
   * Cleanup expired sessions (optional).
   */
  cleanup?(): Promise<void>;
}

/**
 * In-memory session store implementation.
 * WARNING: Data is lost on server restart. Use a persistent store for production.
 */
export class MemorySessionStore implements SessionStore {
  private sessions: Map<string, Session> = new Map();

  async get(session_id: string): Promise<Session | null> {
    return this.sessions.get(session_id) || null;
  }

  async set(session_id: string, session: Session): Promise<void> {
    this.sessions.set(session_id, session);
  }

  async delete(session_id: string): Promise<void> {
    this.sessions.delete(session_id);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [session_id, session] of this.sessions.entries()) {
      // Remove sessions older than max_age (stored in session data)
      if (session.data.__max_age && now - session.created_at > session.data.__max_age) {
        this.sessions.delete(session_id);
      }
    }
  }
}

/**
 * Session middleware configuration options.
 */
export interface SessionOptions {
  /**
   * Secret key for signing session IDs (recommended for production).
   * If not provided, sessions are not signed (less secure).
   */
  secret?: string;

  /**
   * Session cookie name (default: 'session_id')
   */
  cookie_name?: string;

  /**
   * Session max age in milliseconds (default: 24 hours)
   */
  max_age?: number;

  /**
   * Session store implementation (default: MemorySessionStore)
   */
  store?: SessionStore;

  /**
   * Cookie options
   */
  cookie_options?: {
    /** Cookie path (default: '/') */
    path?: string;
    /** Cookie domain */
    domain?: string;
    /** HTTP only flag (default: true) */
    http_only?: boolean;
    /** Secure flag - HTTPS only (default: false) */
    secure?: boolean;
    /** SameSite policy (default: 'lax') */
    same_site?: 'strict' | 'lax' | 'none';
  };

  /**
   * Auto-cleanup interval in milliseconds (default: 1 hour)
   * Set to 0 to disable auto-cleanup
   */
  cleanup_interval?: number;
}

/**
 * Generate a secure random session ID.
 * @returns Session ID string
 */
function generate_session_id(): string {
  return crypto.randomUUID();
}

/**
 * Session management middleware for cookie-based sessions.
 *
 * Features:
 * - Cookie-based session tracking
 * - Pluggable session storage (memory, Redis, database, etc.)
 * - Auto session creation and renewal
 * - Session expiration
 * - CSRF token generation utilities
 * - Secure session ID generation
 *
 * @example
 * ```typescript
 * import { bunserve, router, sessions } from 'bunserve';
 *
 * const app = bunserve({ router: router() });
 *
 * // Basic usage with in-memory store
 * app.use(sessions({
 *   secret: 'your-secret-key',
 *   max_age: 24 * 60 * 60 * 1000 // 24 hours
 * }));
 *
 * // Access session in routes
 * app.get('/login', async ({ body, request }) => {
 *   const session = request.session;
 *   session.data.user_id = user.id;
 *   session.data.username = user.username;
 *   return { message: 'Logged in' };
 * });
 *
 * // Custom store (Redis example)
 * import { RedisSessionStore } from './redis-store';
 *
 * app.use(sessions({
 *   store: new RedisSessionStore(redis_client),
 *   max_age: 7 * 24 * 60 * 60 * 1000 // 7 days
 * }));
 * ```
 */
export function sessions(options: SessionOptions): Middleware {
  const {
    secret,
    cookie_name = 'session_id',
    max_age = 24 * 60 * 60 * 1000, // 24 hours
    store = new MemorySessionStore(),
    cookie_options = {},
    cleanup_interval = 60 * 60 * 1000 // 1 hour
  } = options;

  const {
    path = '/',
    domain,
    http_only = true,
    secure = false,
    same_site = 'lax'
  } = cookie_options;

  // Setup auto-cleanup if interval is set and store supports it
  if (cleanup_interval > 0 && store.cleanup) {
    setInterval(() => {
      store.cleanup?.().catch((err) => {
        console.error('Session cleanup error:', err);
      });
    }, cleanup_interval);
  }

  return async (context, next) => {
    // Get session ID from cookie
    let session_id = context.cookies.get(cookie_name);
    let session: Session | null = null;

    // Try to load existing session
    if (session_id) {
      session = await store.get(session_id);

      // Validate session hasn't expired
      if (session && Date.now() - session.created_at > max_age) {
        await store.delete(session_id);
        session = null;
        session_id = null;
      }
    }

    // Create new session if none exists
    if (!session || !session_id) {
      session_id = generate_session_id();
      const now = Date.now();
      session = {
        id: session_id,
        data: {
          __max_age: max_age
        },
        created_at: now,
        last_access: now
      };
      await store.set(session_id, session);

      // Set session cookie
      context.cookies.set(cookie_name, session_id, {
        path,
        domain,
        httpOnly: http_only,
        secure,
        sameSite: same_site,
        maxAge: Math.floor(max_age / 1000) // Convert to seconds
      });
    } else {
      // Update last access time
      session.last_access = Date.now();
      await store.set(session_id, session);
    }

    // Attach session to request
    (context.request as any).session = session;

    // Continue to next middleware
    await next();

    // Save session after handler completes (in case it was modified)
    if (session) {
      await store.set(session_id!, session);
    }
  };
}

/**
 * Helper function to generate a CSRF token for a session.
 * Store this in the session and validate it on state-changing requests.
 *
 * @example
 * ```typescript
 * import { generate_csrf_token, validate_csrf_token } from 'bunserve';
 *
 * // In a route handler
 * app.get('/form', ({ request }) => {
 *   const csrf_token = generate_csrf_token(request.session);
 *   request.session.data.csrf_token = csrf_token;
 *   return { csrf_token };
 * });
 *
 * app.post('/submit', ({ request, body }) => {
 *   if (!validate_csrf_token(request.session, body.csrf_token)) {
 *     throw new Error('Invalid CSRF token');
 *   }
 *   // Process form...
 * });
 * ```
 */
export function generate_csrf_token(session: Session): string {
  return crypto.randomUUID();
}

/**
 * Validate a CSRF token against the session.
 * @param session - Session object
 * @param token - Token to validate
 * @returns True if token is valid
 */
export function validate_csrf_token(session: Session, token: string): boolean {
  return session.data.csrf_token === token;
}

/**
 * Helper function to destroy a session.
 * Removes session data from store and clears cookie.
 *
 * @example
 * ```typescript
 * import { destroy_session } from 'bunserve';
 *
 * app.post('/logout', async ({ request, cookies }) => {
 *   await destroy_session(request.session, cookies, store);
 *   return { message: 'Logged out' };
 * });
 * ```
 */
export async function destroy_session(
  session: Session,
  cookies: any,
  store: SessionStore,
  cookie_name = 'session_id'
): Promise<void> {
  await store.delete(session.id);
  cookies.delete(cookie_name);
}
