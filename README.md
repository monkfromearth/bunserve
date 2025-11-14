# BunServe

[![npm version](https://badge.fury.io/js/bunserve.svg)](https://www.npmjs.com/package/bunserve)
[![CI](https://github.com/monkfromearth/bunserve/workflows/CI/badge.svg)](https://github.com/monkfromearth/bunserve/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.2.0-black)](https://bun.sh)

**Express-like typesafe routing library built on Bun.serve with request-scoped context management.**

BunServe provides a modern, type-safe HTTP routing library for Bun that combines the simplicity of Express with enhanced TypeScript support and built-in context management using @theinternetfolks/context.

## Features

- ⚡ **Blazing Fast** - 170,000+ req/s with minimal overhead (0.02ms avg latency)
- 🔒 **Secure by Default** - Built-in security headers, CORS protection, and input sanitization
- 🚀 **Built on Bun's Native Router** - Leverages Bun.serve's native routing for <5% performance overhead
- 🎯 **Type-safe routing** - TypeScript generics for route parameter extraction
- 🌟 **Wildcard routes** - Support for `/*` and parameter routes like `/api/admin/*`
- 📦 **Request-scoped context** - Built-in context management with unique request IDs
- 🍪 **Native cookie support** - Uses Bun's built-in CookieMap API
- 🛣️ **Express-like API** - Familiar `.get()`, `.post()`, etc. syntax
- 🔄 **Middleware support** - Global and route-specific middleware chains with built-in error handling, CORS, and logging
- 📝 **Auto content detection** - Smart response formatting (JSON, text, HTML, XML, images, CSV)
- 🧪 **Comprehensive testing** - 130+ tests covering security, memory leaks, and performance
- 📊 **Production-ready** - Error handling, health checks, metrics, and monitoring support

## Installation

```bash
bun add bunserve
```

## Why BunServe?

Choosing the right web framework depends on your priorities. Here's how BunServe compares to popular alternatives:

| Feature | BunServe | Express | Hono | Elysia |
|---------|----------|---------|------|--------|
| **Runtime** | Bun | Node.js | Any (Bun/Node/Deno/Edge) | Bun |
| **Performance** | ~2-7% overhead vs raw Bun | Slow (~10-20k req/s) | Fast (~30k req/s) | Very Fast (~35k req/s) |
| **API Style** | Express-like | Express | Hono-specific | Elysia-specific |
| **Type Safety** | Full (inferred params) | Partial | Full | Full |
| **Learning Curve** | Low (familiar API) | Low | Medium | Medium-High |
| **Middleware** | Built-in + Express-like | Rich ecosystem | Built-in | Built-in |
| **Context Management** | AsyncLocalStorage | Manual | Manual | Built-in |
| **File Uploads** | Bun native | Multer required | Built-in | Built-in |
| **Validation** | Bring your own | Bring your own | Built-in | Built-in (TypeBox) |
| **WebSockets** | Bun native | External lib required | Built-in | Built-in |
| **Bun Optimization** | ✅ Native routes | ❌ N/A | ✅ Optimized | ✅ Optimized |
| **Migration Path** | Easy from Express | N/A | New API to learn | New API to learn |
| **Bundle Size** | Minimal | Large | Small | Small |
| **Best For** | Express users on Bun, rapid development | Node.js ecosystem, mature projects | Cross-runtime apps | Bun-first, schema validation |

**When to choose BunServe:**
- ✅ Migrating from Express to Bun
- ✅ Want familiar API with Bun performance
- ✅ Need minimal learning curve
- ✅ Rapid prototyping and development
- ✅ Express-like middleware ecosystem

**When to choose alternatives:**
- **Express**: Staying on Node.js, need massive middleware ecosystem
- **Hono**: Need cross-runtime compatibility (Cloudflare Workers, Deno, etc.)
- **Elysia**: Want built-in validation, Bun-first features, schema-driven development

## Performance

BunServe delivers exceptional performance with minimal overhead over Bun's native routing:

| Scenario | Requests/sec | Avg Latency | p95 Latency |
|----------|-------------|-------------|-------------|
| **404 Handling** | 170,000 req/s | 0.006ms | 0.013ms |
| **Route Parameters** | 60,000 req/s | 0.017ms | 0.034ms |
| **Simple GET** | 45,000 req/s | 0.022ms | 0.039ms |
| **JSON Parsing** | 40,000 req/s | 0.024ms | 0.052ms |
| **Middleware (3x)** | 55,000 req/s | 0.018ms | 0.031ms |

### Memory Efficiency

- **<1KB per request** - Stable memory usage across all scenarios
- **No memory leaks** - Tested up to 20,000 consecutive requests
- **<15MB growth** - Even under extreme load scenarios with file uploads
- **Automatic cleanup** - Efficient garbage collection with periodic GC

Benchmark tests validate performance stays within 10% of baseline across releases.

[View detailed benchmarks →](./benchmarks/README.md)

## Security

BunServe prioritizes security with built-in protections and best practices:

### Security Rating: **A** (Excellent)

✅ **Built-in Protections**
- **Security Headers** - CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- **CORS Protection** - Secure origin validation (fixed hostname matching)
- **Header Injection Prevention** - Sanitized outputs in CSV and other responses
- **Input Sanitization** - Case-insensitive content-type parsing
- **Error Handling** - No sensitive information leakage in production

✅ **Security Middleware**
```typescript
import { bunserve, security, cors } from 'bunserve';

const app = bunserve();

// Add comprehensive security headers
app.use(security());

// Configure CORS with strict origin validation
app.use(cors({ preset: 'production', allowed_origins: ['https://example.com'] }));
```

✅ **Security Best Practices**
- Use `error_handler()` to prevent stack trace leakage in production
- Configure HSTS for HTTPS enforcement
- Implement CSP to prevent XSS attacks
- Validate and sanitize all user inputs
- Use rate limiting for API endpoints (community packages)

[View security audit →](./SECURITY_AUDIT.md)

## Testing

Comprehensive test suite with 130+ tests ensuring reliability and security:

### Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| **Unit Tests** | 25 tests | Core routing, middleware, response handling |
| **Integration Tests** | 20 tests | End-to-end request/response cycles |
| **Security Tests** | 15 tests | XSS prevention, injection attacks, CORS validation |
| **Memory Leak Tests** | 15 tests | Long-running stability (up to 20k requests) |
| **Performance Tests** | 8 tests | Regression detection, baseline validation |
| **File Upload Tests** | 7 tests | MultipartFormData, large files, memory cleanup |
| **Edge Cases** | 40 tests | Error handling, malformed input, empty bodies |

### Running Tests

```bash
# Run all tests
bun test

# Run specific test files
bun test test/security.test.ts
bun test test/memory-leak.test.ts
bun test test/performance-regression.test.ts

# Performance regression tracking
bun benchmarks/scripts/regression-tracking.ts
```

All tests pass with 0 failures, ensuring production reliability.

## Quick Start

### Basic Server

```typescript
import { bunserve } from 'bunserve';

// Create a new app instance
const app = bunserve();

// Define routes with handlers
app.get('/hello', () => 'Hello World!');
app.get('/users/:id', ({ params }) => ({ id: params.id }));

// Start the server
app.listen(3000);
```

### Run the Server

```bash
bun run server.ts
```

## API Reference

### Core Functions

#### `bunserve()`

Creates a new app instance for defining routes and starting the server.

```typescript
// Create an app to define your application routes
const app = bunserve();
```

#### `router()`

Creates a sub-router instance for organizing routes that can be mounted on the main app.

```typescript
// Create a sub-router for grouping related routes
const apiRouter = router();
```

### HTTP Methods

All standard HTTP methods are supported with type-safe route parameters:

```typescript
// Define routes for different HTTP methods
app.get<Path>('/users/:id', handler);      // GET requests
app.post<Path>('/users', handler);         // POST requests
app.put<Path>('/users/:id', handler);      // PUT requests
app.patch<Path>('/users/:id', handler);    // PATCH requests
app.delete<Path>('/users/:id', handler);   // DELETE requests
app.options<Path>('/users', handler);      // OPTIONS requests
app.head<Path>('/users', handler);         // HEAD requests
app.all<Path>('/users/:id', handler);      // Matches all HTTP methods
```

### Route Parameters

Route parameters are automatically extracted and type-safe:

```typescript
// Define route with multiple parameters
app.get('/users/:id/posts/:post_id', ({ params }) => {
  // params is typed as { id: string; post_id: string }
  // TypeScript knows exactly what parameters are available
  return {
    user_id: params.id,
    post_id: params.post_id
  };
});
```

### Built-in Middleware

BunServe includes production-ready middleware out of the box:

### Error Handler

Catch and format errors with structured error responses:

```typescript
import { bunserve, error_handler } from 'bunserve';

const app = bunserve();

// Add error handler middleware (should be first!)
// This catches all errors thrown in your routes
app.use(error_handler({
  include_stack: process.env.NODE_ENV === 'development' // Show stack traces in dev
}));

app.get('/users/:id', ({ params }) => {
  // Find user in your database/array
  const user = users.find(u => u.id === params.id);

  // Throw errors with status property
  if (!user) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
});
```

**Custom error classes:**
```typescript
// Create reusable error classes
class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Use in routes
throw new AppError('User not found', 404);
throw new AppError('Unauthorized', 401);
```

### CORS Middleware

Enable Cross-Origin Resource Sharing:

```typescript
import { bunserve, cors } from 'bunserve';

const app = bunserve();

// Development preset - allows localhost origins
app.use(cors({ preset: 'development' }));

// Production preset - explicit allowed origins only
app.use(cors({
  preset: 'production',
  allowed_origins: ['https://example.com']
}));

// Custom configuration
app.use(cors({
  origin: ['https://example.com'],                      // Allowed origins
  credentials: true,                                     // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],            // Allowed methods
  allowed_headers: ['Content-Type', 'Authorization']    // Allowed headers
}));
```

### Logger Middleware

Request logging with multiple formats:

```typescript
import { bunserve, logger } from 'bunserve';

const app = bunserve();

// Development logging - colorful output for easy reading
app.use(logger({ preset: 'development' }));

// Production logging - includes timestamps for production logs
app.use(logger({ preset: 'production' }));

// Custom logging configuration
app.use(logger({
  format: 'dev',                          // Log format: 'dev', 'combined', 'common'
  skip: (path) => path === '/health'      // Skip logging for specific paths
}));
```

### Security Headers Middleware

Add comprehensive security headers to protect against common vulnerabilities:

```typescript
import { bunserve, security } from 'bunserve';

const app = bunserve();

// Use default security headers (recommended for production)
app.use(security());

// Custom configuration
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],    // Allow inline scripts if needed
      'style-src': ["'self'", "'unsafe-inline'"],     // Allow inline styles
      'img-src': ["'self'", 'https:', 'data:']
    }
  },
  frame_options: 'SAMEORIGIN',                         // Allow framing from same origin
  strict_transport_security: {
    max_age: 31536000,                                 // 1 year
    include_sub_domains: true,
    preload: true
  }
}));

// Disable specific headers
app.use(security({
  content_security_policy: false,   // Disable CSP if using a CDN
  strict_transport_security: false  // Disable HSTS for development
}));
```

**Headers Added:**
- `Content-Security-Policy` - Prevents XSS attacks
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `X-XSS-Protection` - Browser XSS protection
- `Strict-Transport-Security` - Forces HTTPS
- `Referrer-Policy` - Controls referrer information
- `Permissions-Policy` - Controls browser features
- `X-Permitted-Cross-Domain-Policies` - Flash/PDF protection

## Health Checks

You can easily create custom health check endpoints:

```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

// Simple health check endpoint
app.get('/health', () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}));

// Advanced health check with dependency checks
app.get('/health/full', async () => {
  const checks = {
    database: await checkDatabase(),  // Your database check function
    redis: await checkRedis()          // Your Redis check function
  };

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks
  };
});
```

## Custom Middleware

Add your own middleware that runs for all routes:

```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

// Global middleware - runs for every request
// The context parameter is destructured to { request }
app.use(async ({ request }, next) => {
  console.log('Request received:', request.url);
  await next(); // Call next middleware or route handler
});

// Route-specific middleware - only runs for specific routes
// The context parameter is destructured to { request, set }
const auth_middleware = async ({ request, set }, next) => {
  // Check for authentication token in headers
  const token = request.headers.get('authorization');

  if (!token) {
    // Throw error if no token provided
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  // Continue to next middleware/handler if authenticated
  await next();
};

// Apply middleware to specific route
app.get('/protected', [auth_middleware], () => {
  return 'Protected content';
});
```

### Response Configuration

Control response formatting using the `set` object:

```typescript
app.get('/api/data', ({ set }) => {
  // Set custom HTTP status code
  set.status = 201;

  // Add custom response headers
  set.headers['X-Custom-Header'] = 'value';

  // Set cache duration (1 hour)
  set.cache = '1h';

  // Return response data
  return { created: true };
});
```

### Content Types

Auto-detect content type or specify explicitly:

```typescript
// Plain text response
app.get('/text', ({ set }) => {
  set.content = 'text'; // Force text/plain content type
  return 'Plain text response';
});

// JSON response (auto-detected for objects)
app.get('/json', ({ set }) => {
  set.content = 'json'; // Force application/json
  return { message: 'JSON response' };
});

// HTML response
app.get('/html', ({ set }) => {
  set.content = 'html'; // Force text/html content type
  return '<h1>Hello World</h1>';
});
```

### Context Integration

Access request-scoped context anywhere in your application:

```typescript
app.get('/context', () => {
  // Get the request-scoped context with type safety
  const context = Context.get<{
    request_id: string;
    start_time: number;
    request: {
      method: string;
      url: string;
      headers: Record<string, string>;
    };
  }>();

  // Calculate request duration
  const duration = Date.now() - context.start_time;

  return {
    request_id: context.request_id,  // Unique request ID
    method: context.request.method,  // HTTP method
    duration                          // Time elapsed in ms
  };
});
```

### Request Body Parsing

Automatic body parsing for JSON and form data:

```typescript
app.post('/api/users', async ({ body }) => {
  // body is automatically parsed based on Content-Type header
  // Supports: application/json, application/x-www-form-urlencoded
  return {
    received: true,
    user: body // Parsed body object
  };
});
```

## Wildcard Routes

Support for wildcard routes to match multiple paths:

```typescript
// Match all paths under /api/admin/
// Example: /api/admin/users, /api/admin/settings, etc.
app.get('/api/admin/*', ({ params }) => {
  const resource = params['*'];  // Captures the wildcard part
  return { admin_resource: resource };
});

// Specific routes take precedence over wildcards
app.get('/api/admin/dashboard', () => {
  return { page: 'dashboard' };
});
```

## Cookie Management

BunServe uses Bun's native cookie API for efficient cookie management:

```typescript
// Setting cookies on login
app.post('/login', ({ request, cookies }) => {
  // Set a secure session cookie using Bun's CookieMap
  cookies.set('session_id', 'abc123', {
    httpOnly: true,  // Prevent JavaScript access (security)
    secure: true,     // Only send over HTTPS
    maxAge: 3600,     // Expire after 1 hour (in seconds)
    path: '/'         // Available on all paths
  });

  return { success: true };
});

// Reading cookies
app.get('/profile', ({ cookies }) => {
  // Read cookie value
  const session_id = cookies.get('session_id');
  return { session_id };
});

// Deleting cookies on logout
app.post('/logout', ({ cookies }) => {
  // Remove the session cookie
  cookies.delete('session_id', { path: '/' });
  return { success: true };
});
```

## Query Parameters

Access query parameters easily:

```typescript
// Handle search with query parameters
app.get('/search', ({ query }) => {
  // Get query params with defaults
  const search_term = query.q || '';
  const page = parseInt(query.page || '1');

  return {
    query: search_term,
    page,
    results: [] // Your search results here
  };
});

// Example request: GET /search?q=hello&page=2
```

## Documentation

Comprehensive documentation is available in the [docs/docs](./docs/docs) directory:

- **[Overview](./docs/docs/01-index.md)** - Library overview and key features
- **[Getting Started](./docs/docs/02-getting-started.md)** - Installation and first steps
- **[Routing Guide](./docs/docs/03-routing.md)** - Complete routing patterns and best practices
- **[Middleware](./docs/docs/04-middleware.md)** - Built-in and custom middleware
- **[Error Handling](./docs/docs/05-error-handling.md)** - Error handling patterns and HttpError usage
- **[Cookies & Sessions](./docs/docs/06-cookies.md)** - Cookie management and session handling
- **[Examples](./docs/docs/07-examples.md)** - Real-world examples (REST API, auth, file uploads, WebSocket, database)
- **[API Reference](./docs/docs/08-api-reference.md)** - Complete API documentation

## Examples

See the [examples/rest-api.ts](./examples/rest-api.ts) file for a complete REST API example with:
- CRUD operations
- Middleware integration
- Wildcard routes
- Query parameters
- HTML responses
- Context usage

Run it with:
```bash
bun examples/rest-api.ts
```

### REST API Example

```typescript
import { bunserve } from 'bunserve';

// Define User type for type safety
interface User {
  id: string;
  name: string;
  email: string;
}

// In-memory user storage (use database in production)
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' }
];

const app = bunserve();

// Get all users
app.get('/users', () => users);

// Get user by ID with error handling
app.get('/users/:id', ({ params, set }) => {
  // Find user in array
  const user = users.find(u => u.id === params.id);

  if (!user) {
    // Return 404 if user not found
    set.status = 404;
    return { error: 'User not found' };
  }

  return user;
});

// Create new user
app.post('/users', async ({ body, set }) => {
  // Create new user from request body
  const new_user: User = {
    id: String(users.length + 1),
    name: body.name,
    email: body.email
  };

  // Add to users array
  users.push(new_user);

  // Return 201 Created status
  set.status = 201;
  return new_user;
});

// Start the server
app.listen(3000);
```

### Middleware Example

```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

// Logging middleware - tracks request duration
app.use(async (context, next) => {
  const start = Date.now();
  await next(); // Process the request
  const duration = Date.now() - start;
  console.log(`${context.request.method} ${context.request.url} - ${duration}ms`);
});

// CORS middleware - allow cross-origin requests
app.use(async (context, next) => {
  context.set.headers['Access-Control-Allow-Origin'] = '*';
  context.set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  context.set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  await next();
});

// Auth middleware - require Bearer token
const require_auth = async (context, next) => {
  // Get authorization header
  const auth_header = context.request.headers.get('authorization');

  // Check if Bearer token exists
  if (!auth_header || !auth_header.startsWith('Bearer ')) {
    context.set.status = 401;
    return { error: 'Unauthorized' };
  }

  // Token valid, continue to route handler
  await next();
};

// Protected route - requires authentication
app.get('/protected', [require_auth], () => {
  return { message: 'Protected data' };
});

// Start the server
app.listen(3000);
```

### Sub-Router Example

```typescript
import { bunserve, router } from 'bunserve';

const app = bunserve();

// Create a sub-router for API routes
const apiRouter = router();

// Define routes on the sub-router
apiRouter.get('/posts', () => ({
  posts: [
    { id: 1, title: 'First Post' },
    { id: 2, title: 'Second Post' }
  ]
}));

apiRouter.get('/posts/:id', ({ params }) => ({
  id: params.id,
  title: 'Post Title',
  content: 'Post content here...'
}));

apiRouter.get('/comments', () => ({
  comments: [
    { id: 1, text: 'Great post!' },
    { id: 2, text: 'Thanks for sharing' }
  ]
}));

// Mount the sub-router under /api
app.use('/api', apiRouter);

// Main app routes
app.get('/', () => 'Welcome to the API');

// Start the server
// Now accessible at: /api/posts, /api/posts/:id, /api/comments
app.listen(3000);
```

## Testing

BunServe includes comprehensive test coverage. Run tests with:

```bash
bun test
```

## Development

### Building

```bash
bun build
```

### Linting

```bash
bun run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please use the GitHub issues page.