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

```typescript
import { create_router } from 'bunserve';

const router = create_router();

// Simple logging middleware that runs before route handlers
router.use(async ({ request }, next) => {
  console.log(`${request.method} ${request.url}`);
  // Continue to next middleware or handler
  await next();
});

// Route handler - runs after middleware
router.get('/', () => 'Hello World');
```

### Middleware Order

Middleware executes in the order you register it:

```typescript
// First middleware - executes first
router.use(async ({}, next) => {
  console.log('1: Before');
  await next(); // Call next middleware
  console.log('1: After');
});

// Second middleware - executes second
router.use(async ({}, next) => {
  console.log('2: Before');
  await next(); // Call route handler
  console.log('2: After');
});

// Route handler - executes last
router.get('/', () => {
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

Catches and formats errors:

```typescript
import { error_handler, HttpError } from 'bunserve';

const router = create_router();

// Add error handler FIRST to catch all errors thrown in routes
router.use(error_handler());

// Route that throws structured errors
router.get('/user/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id);

  if (!user) {
    // Throw a structured 404 error
    throw HttpError.not_found('User not found');
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
router.use(error_handler({
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

#### HttpError Factory Methods

```typescript
// 400 Bad Request - client sent invalid data
throw HttpError.bad_request('Invalid input', { field: 'email' });

// 401 Unauthorized - authentication required
throw HttpError.unauthorized('Please login');

// 403 Forbidden - authenticated but not authorized
throw HttpError.forbidden('Access denied');

// 404 Not Found - resource doesn't exist
throw HttpError.not_found('Resource not found');

// 409 Conflict - resource conflict (e.g., duplicate)
throw HttpError.conflict('User already exists');

// 500 Internal Server Error - server-side error
throw HttpError.internal('Something went wrong');
```

### CORS Middleware

Enable Cross-Origin Resource Sharing:

```typescript
import { cors } from 'bunserve';

// Allow all origins (use cautiously in production)
router.use(cors());

// Custom configuration for specific origins
router.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],  // Allow specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],                    // Allow specific HTTP methods
  allowed_headers: ['Content-Type', 'Authorization'],            // Allow specific headers
  credentials: true,                                             // Allow cookies/credentials
  max_age: 86400                                                 // Cache preflight for 24 hours
}));

// Dynamic origin validation with custom function
router.use(cors({
  origin: (origin) => {
    // Allow all .example.com subdomains
    return origin.endsWith('.example.com');
  }
}));
```

#### CORS Presets

```typescript
import { cors_presets } from 'bunserve'

// Development (allows localhost)
router.use(cors_presets.development())

// Production (requires explicit origins)
router.use(cors_presets.production([
  'https://example.com',
  'https://app.example.com'
]))

// Allow all (least secure)
router.use(cors_presets.allow_all())
```

### Logger Middleware

Log HTTP requests:

```typescript
import { logger } from 'bunserve';

// Development logging (with colors and timing)
router.use(logger({ format: 'dev' }));
// Output: [abc123] GET /api/users 200 15ms

// Production logging (with timestamps)
router.use(logger({ format: 'combined' }));
// Output: 2024-01-01T12:00:00.000Z [abc123] GET /api/users 200 15ms

// Minimal logging (just method and path)
router.use(logger({ format: 'tiny' }));
// Output: GET /api/users
```

#### Logger Options

```typescript
router.use(logger({
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

```typescript
import { logger_presets } from 'bunserve'

// Development
router.use(logger_presets.development())

// Production
router.use(logger_presets.production())

// Minimal
router.use(logger_presets.minimal())
```

## Route-Specific Middleware

Apply middleware to specific routes:

```typescript
// Authentication middleware that checks for auth token
const requireAuth = async ({ request, set }, next) => {
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
router.get('/public', () => 'Public data');
// Private route - requires authentication
router.get('/private', [requireAuth], () => 'Private data');

// Multiple middleware - executes in array order
const requireAdmin = async ({ request, set }, next) => {
  // Check if user is admin...
  await next();
};

// Admin route - requires both auth and admin middleware
router.get('/admin', [requireAuth, requireAdmin], () => {
  return 'Admin data';
});
```

## Custom Middleware

### Authentication Middleware

```typescript
import { Context } from 'bunserve';

// Authentication middleware with JWT verification
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

    // Store user in context for use in route handlers
    Context.set({ user });

    await next();
  } catch (error) {
    set.status = 401;
    return { error: 'Invalid token' };
  }
};

// Use in routes - access user from context
router.get('/profile', [authenticate], () => {
  // Retrieve user from context with type safety
  const { user } = Context.get<{ user: User }>();
  return { user };
});
```

### Rate Limiting Middleware

```typescript
// In-memory store for rate limit tracking
const rate_limiter = new Map<string, { count: number; reset: number }>();

// Rate limiting middleware factory
const rate_limit = (max_requests: number, window_ms: number) => {
  return async ({ request, set }, next) => {
    // Get client IP from headers
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    const limit = rate_limiter.get(ip);

    if (limit && now < limit.reset) {
      // Within the time window
      if (limit.count >= max_requests) {
        // Rate limit exceeded
        set.status = 429;
        set.headers['Retry-After'] = String(Math.ceil((limit.reset - now) / 1000));
        return { error: 'Too many requests' };
      }
      limit.count++;
    } else {
      // New time window - reset counter
      rate_limiter.set(ip, {
        count: 1,
        reset: now + window_ms
      });
    }

    await next();
  };
};

// Apply rate limit: 100 requests per 15 minutes
router.use(rate_limit(100, 15 * 60 * 1000));
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

router.use(request_id_middleware)
```

### Performance Monitoring

```typescript
const perf_monitor = async ({ request }, next) => {
  const start = performance.now()

  await next()

  const duration = performance.now() - start
  console.log(`${request.method} ${request.url} took ${duration.toFixed(2)}ms`)
}

router.use(perf_monitor)
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

router.use(validate_json)
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
router.use(conditional_middleware(
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

router.get('/admin', [auth_stack], () => 'Admin')
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

router.use(db_middleware)
```

## Complete Example

Here's a production-ready middleware stack:

```typescript
import {
  create_router,
  create_server,
  error_handler,
  cors,
  logger,
  HttpError
} from 'bunserve'

const router = create_router()

// 1. Error handling (should be first)
router.use(error_handler({
  include_stack: process.env.NODE_ENV === 'development'
}))

// 2. CORS
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true
}))

// 3. Logging
router.use(logger({
  format: process.env.NODE_ENV === 'development' ? 'dev' : 'combined',
  skip: (path) => path === '/health'
}))

// 4. Request ID
router.use(async ({ set }, next) => {
  set.headers['X-Request-ID'] = crypto.randomUUID()
  await next()
})

// 5. Rate limiting
router.use(rate_limit(100, 15 * 60 * 1000))

// 6. Authentication (route-specific)
const authenticate = async ({ request, set }, next) => {
  const token = request.headers.get('authorization')
  if (!token) {
    throw HttpError.unauthorized()
  }
  await next()
}

// Routes
router.get('/health', () => ({ status: 'ok' }))
router.get('/public', () => 'Public data')
router.get('/private', [authenticate], () => 'Private data')

const server = create_server({ router, port: 3000 })
server.listen()
```

## Best Practices

### 1. Order Matters

```typescript
// Good: Error handler first
router.use(error_handler())
router.use(cors())
router.use(logger())

// Bad: Error handler last won't catch errors from other middleware
router.use(cors())
router.use(logger())
router.use(error_handler())
```

### 2. Always Call next()

```typescript
// Good
router.use(async ({}, next) => {
  console.log('Before')
  await next()
  console.log('After')
})

// Bad: Doesn't call next(), handler won't run
router.use(async ({}, next) => {
  console.log('Before')
  // Missing: await next()
})
```

### 3. Return Early for Errors

```typescript
// Good
router.use(async ({ request, set }, next) => {
  if (!request.headers.get('api-key')) {
    set.status = 401
    return { error: 'API key required' }
  }
  await next()
})

// Bad: Calls next() even after error
router.use(async ({ request, set }, next) => {
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
router.use(async ({}, next) => {
  const user = await authenticate()
  Context.set({ user })
  await next()
})

router.get('/profile', () => {
  const { user } = Context.get<{ user: User }>()
  return { user }
})

// Bad: Can't access data from middleware
router.use(async ({}, next) => {
  const user = await authenticate()
  // How do we pass this to the handler?
  await next()
})
```

## Next Steps

- **[Error Handling](./05-error-handling.md)** - Advanced error handling patterns
- **[Response Handling](./responses.md)** - Different response types
- **[Examples](./07-examples.md)** - Complete middleware examples
- **[API Reference](./08-api-reference.md)** - Complete API documentation
