# Middleware Guide

Complete guide to using middleware in BunServe for request processing, authentication, logging, and more.

## What is Middleware?

Middleware functions run before (and after) your route handlers, allowing you to:
- Log requests
- Authenticate users
- Handle errors
- Add CORS headers
- Parse request bodies
- Measure performance
- And much more!

## Basic Middleware

### Creating Middleware

Middleware functions receive a `context` object (which contains `request`, `params`, `set`, etc.) and a `next` function. You can destructure the context to access only what you need:

```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

// Simple logging middleware that runs before route handlers
// The first parameter is the context object - here we destructure `request` from it
app.use(async ({ request }, next) => {
  console.log(`${request.method} ${request.url}`);
  // Continue to next middleware or handler
  await next();
});

// You can also use the full context object without destructuring
app.use(async (context, next) => {
  console.log(`${context.request.method} ${context.request.url}`);
  await next();
});

// Route handler - runs after middleware
app.get('/', () => 'Hello World');
```

### Middleware Order

Middleware executes in the order you register it:

```typescript
// First middleware - executes first
app.use(async ({}, next) => {
  console.log('1: Before');
  await next(); // Call next middleware
  console.log('1: After');
});

// Second middleware - executes second
app.use(async ({}, next) => {
  console.log('2: Before');
  await next(); // Call route handler
  console.log('2: After');
});

// Route handler - executes last
app.get('/', () => {
  console.log('Handler');
  return 'Done';
});

// Output demonstrates middleware execution order:
// 1: Before
// 2: Before
// Handler
// 2: After
// 1: After
```

## Built-in Middleware

BunServe includes several production-ready middleware:

### Error Handler

Catches and formats errors thrown from route handlers:

```typescript
import { bunserve, error_handler } from 'bunserve';

const app = bunserve();

// Add error handler FIRST to catch all errors thrown in routes
app.use(error_handler());

// Route that throws errors with status property
// The context parameter is destructured to { params }
app.get('/user/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id);

  if (!user) {
    // Throw a plain Error with a status property
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
});

// Errors are automatically caught and formatted:
// {
//   "error": "User not found",
//   "status": 404
// }
```

#### Error Handler Options

```typescript
// Configure error handler with custom options
app.use(error_handler({
  // Include stack traces (default: true in dev, false in production)
  include_stack: true,

  // Custom error formatter function
  format_error: (error, context) => {
    return {
      message: error.message,
      timestamp: new Date().toISOString()
    };
  },

  // Custom error logger function
  log_error: (error, context) => {
    console.error('Error occurred:', error);
  }
}));
```

#### Creating Custom Error Classes

You can create your own error classes with status codes:

```typescript
// Define a custom error class
class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Use in routes
app.get('/admin', () => {
  throw new AppError('Forbidden', 403);
});

// Or create factory functions for common errors
const NotFoundError = (message: string) => {
  const error: any = new Error(message);
  error.status = 404;
  return error;
};

const UnauthorizedError = (message: string) => {
  const error: any = new Error(message);
  error.status = 401;
  return error;
};

// Use the factories
app.get('/user/:id', ({ params }) => {
  if (!user) {
    throw NotFoundError('User not found');
  }
  return user;
});
```

### CORS Middleware

Enable Cross-Origin Resource Sharing:

```typescript
import { bunserve, cors } from 'bunserve';

const app = bunserve();

// Allow all origins (use cautiously in production)
app.use(cors());

// Custom configuration for specific origins
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],  // Allow specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],                    // Allow specific HTTP methods
  allowed_headers: ['Content-Type', 'Authorization'],            // Allow specific headers
  credentials: true,                                             // Allow cookies/credentials
  max_age: 86400                                                 // Cache preflight for 24 hours
}));

// Dynamic origin validation with custom function
app.use(cors({
  origin: (origin) => {
    // Allow all .example.com subdomains
    return origin.endsWith('.example.com');
  }
}));
```

#### CORS Presets

Use the `preset` option for common CORS configurations:

```typescript
import { cors } from 'bunserve';

// Development preset (allows localhost)
app.use(cors({ preset: 'development' }));

// Production preset (requires explicit origins)
app.use(cors({
  preset: 'production',
  allowed_origins: ['https://example.com', 'https://app.example.com']
}));

// Allow all preset (least secure)
app.use(cors({ preset: 'allow_all' }));

// Preset with custom overrides
app.use(cors({
  preset: 'development',
  max_age: 3600  // Override the preset's max_age
}));
```

### Logger Middleware

Log HTTP requests:

```typescript
import { bunserve, logger } from 'bunserve';

const app = bunserve();

// Development logging (with colors and timing)
app.use(logger({ format: 'dev' }));
// Output: [abc123] GET /api/users 200 15ms

// Production logging (with timestamps)
app.use(logger({ format: 'combined' }));
// Output: 2024-01-01T12:00:00.000Z [abc123] GET /api/users 200 15ms

// Minimal logging (just method and path)
app.use(logger({ format: 'tiny' }));
// Output: GET /api/users
```

#### Logger Options

```typescript
app.use(logger({
  format: 'dev', // 'dev', 'combined', 'common', 'short', 'tiny'

  // Custom log function
  log: (message) => {
    // Send to logging service
    console.log(message)
  },

  // Skip certain paths
  skip: (path) => {
    return path === '/health' || path.startsWith('/metrics')
  }
}))
```

#### Logger Presets

Use the `preset` option for common logging configurations:

```typescript
import { logger } from 'bunserve';

// Development preset (colored output with request IDs)
app.use(logger({ preset: 'development' }));

// Production preset (timestamped combined format)
app.use(logger({ preset: 'production' }));

// Minimal preset (just method and path)
app.use(logger({ preset: 'minimal' }));

// Preset with custom overrides
app.use(logger({
  preset: 'development',
  skip: (path) => path === '/health'  // Override the preset's skip function
}));
```

### Security Headers Middleware

Add comprehensive security headers to protect against common web vulnerabilities:

```typescript
import { bunserve, security } from 'bunserve';

const app = bunserve();

// Use default security headers (recommended for most applications)
app.use(security());

// Custom security configuration
app.use(security({
  // Content Security Policy - controls which resources can be loaded
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],                        // Only load resources from same origin
      'script-src': ["'self'", "'unsafe-inline'"],      // Allow inline scripts if needed
      'style-src': ["'self'", "'unsafe-inline'"],       // Allow inline styles
      'img-src': ["'self'", 'https:', 'data:']          // Allow images from HTTPS and data URIs
    }
  },

  // X-Frame-Options - prevents clickjacking attacks
  frame_options: 'SAMEORIGIN',                          // Allow framing from same origin only

  // X-Content-Type-Options - prevents MIME type sniffing
  content_type_options: 'nosniff',                      // Force browser to respect Content-Type

  // X-XSS-Protection - legacy XSS protection for older browsers
  xss_protection: '1; mode=block',                      // Enable XSS filter and block rendering

  // Strict-Transport-Security (HSTS) - enforces HTTPS
  strict_transport_security: {
    max_age: 31536000,                                  // 1 year in seconds
    include_sub_domains: true,                          // Apply to all subdomains
    preload: true                                       // Allow inclusion in browser preload lists
  },

  // Referrer-Policy - controls referrer information
  referrer_policy: 'strict-origin-when-cross-origin',  // Send origin only for cross-origin requests

  // Permissions-Policy - controls which browser features can be used
  permissions_policy: {
    camera: [],                                         // Disable camera access
    microphone: [],                                     // Disable microphone access
    geolocation: ['self'],                              // Allow geolocation only from same origin
    payment: []                                         // Disable payment API
  },

  // X-Permitted-Cross-Domain-Policies - controls Adobe Flash/PDF cross-domain
  cross_domain_policy: 'none',                          // No cross-domain policies allowed

  // Remove X-Powered-By header to hide server information
  remove_powered_by: true                               // Removes X-Powered-By: Bun header
}));
```

#### Security Headers Options

**Purpose and Impact:**

Each security header protects against specific vulnerabilities:

1. **Content Security Policy (CSP)** - Prevents XSS attacks by controlling resource loading
   - Impact: Blocks malicious scripts from executing
   - Use case: Essential for applications handling user-generated content

2. **X-Frame-Options** - Prevents clickjacking attacks
   - Impact: Stops your site from being embedded in malicious iframes
   - Use case: Critical for login pages and sensitive operations

3. **Strict-Transport-Security (HSTS)** - Enforces HTTPS connections
   - Impact: Prevents man-in-the-middle attacks by forcing HTTPS
   - Use case: Required for production applications handling sensitive data

4. **Permissions-Policy** - Controls browser feature access
   - Impact: Reduces attack surface by disabling unnecessary browser APIs
   - Use case: Privacy-focused applications

#### Disabling Specific Headers

Disable headers when not needed:

```typescript
// Disable specific headers (useful for development or CDN usage)
app.use(security({
  content_security_policy: false,           // Disable CSP if using external CDN
  strict_transport_security: false          // Disable HSTS for local development
}));

// Minimal security setup (not recommended for production)
app.use(security({
  content_security_policy: false,
  strict_transport_security: false,
  frame_options: 'SAMEORIGIN',              // Keep basic clickjacking protection
  remove_powered_by: true                   // Always hide server information
}));
```

#### Development vs Production Security

```typescript
const app = bunserve();

// Development configuration - relaxed security for easier debugging
if (process.env.NODE_ENV === 'development') {
  app.use(security({
    content_security_policy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Allow eval for hot reload
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'https:', 'data:', 'blob:']
      }
    },
    strict_transport_security: false,       // Disable HSTS for HTTP development
    frame_options: 'SAMEORIGIN'
  }));
} else {
  // Production configuration - strict security
  app.use(security({
    content_security_policy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],           // No inline scripts in production
        'style-src': ["'self'"],            // No inline styles in production
        'img-src': ["'self'", 'https:'],
        'connect-src': ["'self'", 'https://api.example.com']
      }
    },
    strict_transport_security: {
      max_age: 31536000,
      include_sub_domains: true,
      preload: true
    },
    frame_options: 'DENY',                  // Don't allow any framing
    referrer_policy: 'no-referrer'          // Don't send referrer information
  }));
}
```

#### Common CSP Configurations

```typescript
// API-only application (no frontend assets)
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'none'"],            // Block all resource loading
      'frame-ancestors': ["'none'"]         // Cannot be framed at all
    }
  }
}));

// Application using external CDNs
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        'https://cdn.jsdelivr.net',         // Allow scripts from JSDelivr CDN
        'https://unpkg.com'                 // Allow scripts from Unpkg CDN
      ],
      'style-src': [
        "'self'",
        'https://cdn.jsdelivr.net',         // Allow styles from JSDelivr CDN
        'https://fonts.googleapis.com'      // Allow Google Fonts
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'         // Allow Google Fonts
      ],
      'img-src': ["'self'", 'https:', 'data:']
    }
  }
}));

// Application with analytics and third-party services
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        'https://www.google-analytics.com',  // Google Analytics
        'https://www.googletagmanager.com'   // Google Tag Manager
      ],
      'connect-src': [
        "'self'",
        'https://www.google-analytics.com',  // Analytics API calls
        'https://api.example.com'            // Your API
      ],
      'img-src': [
        "'self'",
        'https:',
        'data:',
        'https://www.google-analytics.com'   // Analytics tracking pixels
      ]
    }
  }
}));
```

### Static Files Middleware

Serve static files efficiently with automatic MIME type detection and caching:

```typescript
import { bunserve, static_files } from 'bunserve';

const app = bunserve();

// Serve files from ./public directory
app.use(static_files({ root: './public' }));

// Now files in ./public are accessible:
// http://localhost:3000/index.html -> ./public/index.html
// http://localhost:3000/css/style.css -> ./public/css/style.css
// http://localhost:3000/images/logo.png -> ./public/images/logo.png
```

#### Static Files Options

```typescript
app.use(static_files({
  // Root directory to serve files from (required)
  root: './public',

  // URL prefix to strip before looking up files
  prefix: '/static',
  // http://localhost:3000/static/image.png -> ./public/image.png

  // Cache-Control header duration
  cache: '7d',  // 7 days (supports: s, m, h, d)

  // Index file for directory requests
  index: 'index.html'  // Default: 'index.html'
}));
```

#### Common Static Files Patterns

```typescript
// Serve assets with URL prefix and caching
app.use(static_files({
  root: './public/assets',
  prefix: '/assets',
  cache: '30d'  // Cache for 30 days
}));

// Serve uploads with shorter cache
app.use(static_files({
  root: './uploads',
  prefix: '/uploads',
  cache: '1h'  // Cache for 1 hour
}));

// Multiple static directories with different settings
app.use(static_files({
  root: './public',
  cache: '7d'
}));

app.use(static_files({
  root: './dist',
  prefix: '/app',
  cache: '1d'
}));
```

#### Security Features

The static files middleware includes built-in security:

```typescript
// Path traversal protection
// Request: /../../etc/passwd
// Result: 403 Forbidden

// Only GET and HEAD methods allowed
// POST /style.css -> passes through to next middleware

// Automatic MIME type detection
// .html -> text/html
// .css -> text/css
// .js -> application/javascript
// .json -> application/json
// .png -> image/png
// ...and more
```

### Sessions Middleware

Manage user sessions with cookie-based authentication:

```typescript
import { bunserve, sessions } from 'bunserve';

const app = bunserve();

// Basic session management
app.use(sessions({
  secret: process.env.SESSION_SECRET,  // Required for production
  max_age: 24 * 60 * 60 * 1000        // 24 hours
}));

// Access session in routes
app.post('/login', ({ request, body }) => {
  const session = (request as any).session;

  // Store user data in session
  session.data.user_id = user.id;
  session.data.username = user.username;
  session.data.role = user.role;

  return { message: 'Logged in successfully' };
});

app.get('/profile', ({ request }) => {
  const session = (request as any).session;

  if (!session.data.user_id) {
    const error: any = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }

  return {
    user_id: session.data.user_id,
    username: session.data.username
  };
});
```

#### Session Options

```typescript
import { MemorySessionStore } from 'bunserve';

app.use(sessions({
  // Secret for signing sessions (required in production)
  secret: process.env.SESSION_SECRET,

  // Session cookie name
  cookie_name: 'session_id',  // Default: 'session_id'

  // Session max age in milliseconds
  max_age: 7 * 24 * 60 * 60 * 1000,  // 7 days

  // Session store (default: in-memory)
  store: new MemorySessionStore(),

  // Cookie options
  cookie_options: {
    path: '/',           // Cookie path
    domain: undefined,   // Cookie domain
    http_only: true,     // HTTP only (recommended)
    secure: false,       // HTTPS only (enable in production)
    same_site: 'lax'     // 'strict', 'lax', or 'none'
  },

  // Auto-cleanup interval (0 to disable)
  cleanup_interval: 60 * 60 * 1000  // 1 hour
}));
```

#### Custom Session Store

Implement your own storage backend:

```typescript
import { SessionStore, Session } from 'bunserve';

// Redis session store example
class RedisSessionStore implements SessionStore {
  constructor(private redis: any) {}

  async get(session_id: string): Promise<Session | null> {
    const data = await this.redis.get(`session:${session_id}`);
    return data ? JSON.parse(data) : null;
  }

  async set(session_id: string, session: Session): Promise<void> {
    await this.redis.set(
      `session:${session_id}`,
      JSON.stringify(session),
      'EX',
      86400  // 24 hours in seconds
    );
  }

  async delete(session_id: string): Promise<void> {
    await this.redis.del(`session:${session_id}`);
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically
  }
}

// Use custom store
const redis_store = new RedisSessionStore(redis_client);
app.use(sessions({
  secret: process.env.SESSION_SECRET,
  store: redis_store
}));
```

#### CSRF Protection

Use built-in CSRF helpers for form protection:

```typescript
import { generate_csrf_token, validate_csrf_token } from 'bunserve';

// Generate token for forms
app.get('/form', ({ request }) => {
  const session = (request as any).session;
  const csrf_token = generate_csrf_token(session);
  session.data.csrf_token = csrf_token;

  return { csrf_token };
});

// Validate token on submission
app.post('/submit', ({ request, body }) => {
  const session = (request as any).session;

  if (!validate_csrf_token(session, body.csrf_token)) {
    const error: any = new Error('Invalid CSRF token');
    error.status = 403;
    throw error;
  }

  // Process form safely
  return { message: 'Form submitted' };
});
```

#### Session Logout

Destroy sessions on logout:

```typescript
import { destroy_session } from 'bunserve';

app.post('/logout', async ({ request, cookies }, next) => {
  const session = (request as any).session;
  const store = session_store;  // Your session store instance

  await destroy_session(session, cookies, store);

  return { message: 'Logged out successfully' };
});
```

#### Production Session Setup

```typescript
// Production-ready session configuration
app.use(sessions({
  secret: process.env.SESSION_SECRET,
  max_age: 7 * 24 * 60 * 60 * 1000,  // 7 days
  cookie_options: {
    http_only: true,    // Prevent JavaScript access
    secure: true,        // HTTPS only in production
    same_site: 'strict', // Strict CSRF protection
    domain: '.example.com'  // Share across subdomains
  },
  store: new RedisSessionStore(redis),  // Persistent storage
  cleanup_interval: 60 * 60 * 1000      // Cleanup every hour
}));
```

## Route-Specific Middleware

Apply middleware to specific routes:

```typescript
// Authentication middleware that checks for auth token
// Note: The first parameter is the context object - we destructure request and set from it
const require_auth = async ({ request, set }, next) => {
  const token = request.headers.get('authorization');

  if (!token) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  // Verify token...
  await next();
};

// Apply to specific routes
// Public route - no middleware required
app.get('/public', () => 'Public data');
// Private route - requires authentication
app.get('/private', [require_auth], () => 'Private data');

// Multiple middleware - executes in array order
const require_admin = async ({ request, set }, next) => {
  // Check if user is admin...
  await next();
};

// Admin route - requires both auth and admin middleware
app.get('/admin', [require_auth, require_admin], () => {
  return 'Admin data';
});
```

## Custom Middleware

### Authentication Middleware

```typescript
import { bunserve, Context } from 'bunserve';

const app = bunserve();

// Authentication middleware with JWT verification
// The context parameter is destructured to { request, set }
const authenticate = async ({ request, set }, next) => {
  // Extract Bearer token from Authorization header
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    set.status = 401;
    return { error: 'No token provided' };
  }

  try {
    // Verify JWT token (example)
    const user = verifyJWT(token);

    // Store user in request-scoped Context for use in route handlers
    Context.set({ user });

    await next();
  } catch (error) {
    set.status = 401;
    return { error: 'Invalid token' };
  }
};

// Use in routes - access user from context
app.get('/profile', [authenticate], () => {
  // Retrieve user from Context with type safety
  const { user } = Context.get<{ user: User }>();
  return { user };
});
```

### Request ID Middleware

```typescript
// Add unique request ID to each request for tracing
const request_id = async ({ set }, next) => {
  set.headers['X-Request-ID'] = crypto.randomUUID();
  await next();
};

app.use(request_id);
```

### Caching Middleware

```typescript
const cache = new Map<string, { data: any; expires: number }>()

const cache_middleware = (duration_ms: number) => {
  return async ({ request, set }, next) => {
    const cache_key = request.url

    const cached = cache.get(cache_key)
    if (cached && Date.now() < cached.expires) {
      return cached.data
    }

    await next()

    // Cache the response
    // Note: In real implementation, you'd need to intercept the response
  }
}
```

### Request ID Middleware

```typescript
const request_id_middleware = async ({ set }, next) => {
  const request_id = crypto.randomUUID()

  // Add to response headers
  set.headers['X-Request-ID'] = request_id

  // Store in context
  Context.set({ request_id })

  await next()
}

app.use(request_id_middleware)
```

### Performance Monitoring

```typescript
const perf_monitor = async ({ request }, next) => {
  const start = performance.now()

  await next()

  const duration = performance.now() - start
  console.log(`${request.method} ${request.url} took ${duration.toFixed(2)}ms`)
}

app.use(perf_monitor)
```

### Request Validation

```typescript
const validate_json = async ({ request, set }, next) => {
  if (request.method === 'POST' || request.method === 'PUT') {
    const content_type = request.headers.get('content-type')

    if (!content_type?.includes('application/json')) {
      set.status = 415
      return { error: 'Content-Type must be application/json' }
    }
  }

  await next()
}

app.use(validate_json)
```

## Middleware Patterns

### Conditional Middleware

```typescript
const conditional_middleware = (condition: boolean, middleware: Middleware) => {
  return async (context, next) => {
    if (condition) {
      await middleware(context, next)
    } else {
      await next()
    }
  }
}

// Only log in development
app.use(conditional_middleware(
  process.env.NODE_ENV === 'development',
  logger({ format: 'dev' })
))
```

### Composing Middleware

```typescript
const compose_middleware = (...middlewares: Middleware[]): Middleware => {
  return async (context, next) => {
    let index = 0

    const dispatch = async (): Promise<void> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++]
        await middleware(context, dispatch)
      } else {
        await next()
      }
    }

    await dispatch()
  }
}

// Use
const auth_stack = compose_middleware(
  authenticate,
  requireAdmin
)

app.get('/admin', [auth_stack], () => 'Admin')
```

### Async Middleware

```typescript
const db_middleware = async ({ set }, next) => {
  // Open database connection
  const db = await connect_to_database()

  try {
    Context.set({ db })
    await next()
  } finally {
    // Cleanup
    await db.close()
  }
}

app.use(db_middleware)
```

## Complete Example

Here's a production-ready middleware stack:

```typescript
import {
  bunserve,
  error_handler,
  cors,
  logger
} from 'bunserve'

const app = bunserve()

// 1. Error handling (should be first)
app.use(error_handler({
  include_stack: process.env.NODE_ENV === 'development'
}))

// 2. CORS - using preset
app.use(cors({
  preset: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  allowed_origins: process.env.ALLOWED_ORIGINS?.split(',')
}))

// 3. Logging - using preset
app.use(logger({
  preset: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  skip: (path) => path === '/health'
}))

// 4. Request ID
app.use(async ({ set }, next) => {
  set.headers['X-Request-ID'] = crypto.randomUUID()
  await next()
})

// 5. Authentication (route-specific)
const authenticate = async ({ request, set }, next) => {
  const token = request.headers.get('authorization')
  if (!token) {
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  await next()
}

// Routes
app.get('/health', () => ({ status: 'ok' }))
app.get('/public', () => 'Public data')
app.get('/private', [authenticate], () => 'Private data')

app.listen(3000)
```

## Best Practices

### 1. Order Matters

```typescript
// Good: Error handler first
app.use(error_handler())
app.use(cors())
app.use(logger())

// Bad: Error handler last won't catch errors from other middleware
app.use(cors())
app.use(logger())
app.use(error_handler())
```

### 2. Always Call next()

```typescript
// Good
app.use(async ({}, next) => {
  console.log('Before')
  await next()
  console.log('After')
})

// Bad: Doesn't call next(), handler won't run
app.use(async ({}, next) => {
  console.log('Before')
  // Missing: await next()
})
```

### 3. Return Early for Errors

```typescript
// Good
app.use(async ({ request, set }, next) => {
  if (!request.headers.get('api-key')) {
    set.status = 401
    return { error: 'API key required' }
  }
  await next()
})

// Bad: Calls next() even after error
app.use(async ({ request, set }, next) => {
  if (!request.headers.get('api-key')) {
    set.status = 401
    // Should return here!
  }
  await next()
})
```

### 4. Use Context for Shared Data

```typescript
// Good: Share data via Context
app.use(async ({}, next) => {
  const user = await authenticate()
  Context.set({ user })
  await next()
})

app.get('/profile', () => {
  const { user } = Context.get<{ user: User }>()
  return { user }
})

// Bad: Can't access data from middleware
app.use(async ({}, next) => {
  const user = await authenticate()
  // How do we pass this to the handler?
  await next()
})
```

## Next Steps

- **[Error Handling](./05-error-handling.md)** - Advanced error handling patterns
- **[Response Handling](./09-responses.md)** - Different response types
- **[Examples](./07-examples.md)** - Complete middleware examples
- **[API Reference](./08-api-reference.md)** - Complete API documentation
- **[File Uploads](./12-file-uploads.md)** - Handle file uploads securely
