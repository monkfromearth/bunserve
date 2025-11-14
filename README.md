# BunServe

[![npm version](https://badge.fury.io/js/bunserve.svg)](https://www.npmjs.com/package/bunserve)
[![CI](https://github.com/monkfromearth/bunserve/workflows/CI/badge.svg)](https://github.com/monkfromearth/bunserve/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.2.0-black)](https://bun.sh)

**Express-like typesafe routing library built on Bun.serve with request-scoped context management.**

BunServe provides a modern, type-safe HTTP routing library for Bun that combines the simplicity of Express with enhanced TypeScript support and built-in context management using @theinternetfolks/context.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Why BunServe?](#why-bunserve)
- [Performance](#performance)
- [Security](#security)
- [Testing](#testing)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
- [Documentation](#documentation)
- [Next Steps](#next-steps)
- [Examples](#examples)
- [Development](#development)
- [Contributing](#contributing)

## Features

- ⚡ **Blazing Fast** - 61,000+ req/s with ~2-7% overhead vs raw Bun (0.016ms avg latency)
- 🔒 **Secure by Default** - Built-in security headers, CORS protection, and input sanitization
- 🚀 **Built on Bun's Native Router** - Leverages Bun.serve's native routing for minimal overhead
- 🎯 **Type-safe routing** - TypeScript generics for route parameter extraction
- 🌟 **Wildcard routes** - Support for `/*` and parameter routes like `/api/admin/*`
- 📦 **Request-scoped context** - Built-in context management with unique request IDs
- 🍪 **Native cookie support** - Uses Bun's built-in CookieMap API
- 🛣️ **Express-like API** - Familiar `.get()`, `.post()`, etc. syntax
- 🔄 **Middleware support** - Global and route-specific middleware chains with built-in error handling, CORS, and logging
- 📝 **Auto content detection** - Smart response formatting (JSON, text, HTML, XML, images, CSV)
- 🧪 **Comprehensive testing** - 81 tests covering routing, middleware, security, and performance
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
| **Performance*** | **34,253 req/s** (routing only)<br/>**32,420 req/s** (with middleware)<br/>~2-7% overhead vs raw Bun | ~10-15k req/s (Node.js)<br/>Significantly slower | ~25-30k req/s (Bun)<br/>Fast, edge-optimized | ~30-35k req/s (Bun)<br/>Very fast, Bun-native |
| **Latency*** | **p95: 272µs** (sub-ms)<br/>avg: 155µs | ~5-10ms avg<br/>Slower on Node.js | ~500µs-1ms avg<br/>Edge-optimized | ~300-800µs avg<br/>Bun-optimized |
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

**\*Performance Note**: BunServe numbers are from verified benchmarks (k6, Apache Bench) on Apple Silicon. Other framework numbers are approximate based on community benchmarks and may vary by runtime and configuration. For fair comparison, test in your target environment.

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
| **Route Parameters** | 61,090 req/s | 0.016ms | 0.032ms |
| **Middleware (3x)** | 51,003 req/s | 0.020ms | 0.041ms |
| **JSON Parsing** | 48,121 req/s | 0.021ms | 0.037ms |
| **Simple GET** | 42,770 req/s | 0.023ms | 0.055ms |
| **Full Middleware Stack** | 32,420 req/s | 0.031ms | 0.272ms |

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
- Use session management for authentication and state tracking

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

## Core Features

### 🎯 Type-Safe Routing

Automatic parameter type inference with Express-like API:

```typescript
app.get('/users/:id/posts/:post_id', ({ params }) => {
  // TypeScript knows: params = { id: string; post_id: string }
  return { user_id: params.id, post_id: params.post_id };
});
```

### 🛡️ Built-in Security & Middleware

```typescript
import { bunserve, error_handler, cors, logger, security } from 'bunserve';

const app = bunserve();

// Error handling with stack traces in dev
app.use(error_handler({ include_stack: process.env.NODE_ENV === 'development' }));

// CORS with production presets
app.use(cors({ preset: 'production', allowed_origins: ['https://example.com'] }));

// Request logging
app.use(logger({ preset: 'development' }));

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(security());
```

[→ Learn more about middleware](./docs/docs/04-middleware.md)

### 🍪 Native Cookie Support

```typescript
app.post('/login', ({ cookies }) => {
  cookies.set('session_id', 'abc123', {
    httpOnly: true,
    secure: true,
    maxAge: 3600 // 1 hour
  });
  return { success: true };
});
```

[→ Learn more about cookies](./docs/docs/06-cookies.md)

### 📦 Request Context

Access request-scoped data anywhere using AsyncLocalStorage:

```typescript
import { Context } from 'bunserve';

app.use(async ({}, next) => {
  const ctx = Context.get<{ request_id: string }>();
  console.log(`Request ID: ${ctx.request_id}`);
  await next();
});
```

## Documentation

Comprehensive documentation is available in the [docs/docs](./docs/docs) directory:

- **[Overview](./docs/docs/01-index.md)** - Library overview and key features
- **[Getting Started](./docs/docs/02-getting-started.md)** - Installation and first steps
- **[Routing Guide](./docs/docs/03-routing.md)** - Complete routing patterns and best practices
- **[Middleware](./docs/docs/04-middleware.md)** - Built-in and custom middleware
- **[Error Handling](./docs/docs/05-error-handling.md)** - Error handling patterns
- **[Cookies & Sessions](./docs/docs/06-cookies.md)** - Cookie management and session handling
- **[Examples](./docs/docs/07-examples.md)** - Real-world examples (REST API, auth, file uploads, WebSocket, database)
- **[API Reference](./docs/docs/08-api-reference.md)** - Complete API documentation
- **[Responses](./docs/docs/09-responses.md)** - Response handling, content types, and file serving
- **[Best Practices](./docs/docs/10-best-practices.md)** - Production-ready patterns and recommendations
- **[Deployment](./docs/docs/11-deployment.md)** - Deploy to Docker, Fly.io, Railway, AWS, and more
- **[File Uploads](./docs/docs/12-file-uploads.md)** - Handle file uploads with validation and S3 storage
- **[Migration Guide](./docs/docs/13-migration.md)** - Migrate from Express, Hono, or Elysia

## Next Steps

### Quick Links

- **[Getting Started Guide](./docs/docs/02-getting-started.md)** - Build your first BunServe app
- **[Examples](./docs/docs/07-examples.md)** - Complete working examples (REST API, auth, WebSocket, database)
- **[Deployment Guide](./docs/docs/11-deployment.md)** - Deploy to production (Docker, Fly.io, Railway, AWS)
- **[Migration Guide](./docs/docs/13-migration.md)** - Migrate from Express, Hono, or Elysia
- **[API Reference](./docs/docs/08-api-reference.md)** - Complete API documentation

### Run the Examples

See [examples/rest-api.ts](./examples/rest-api.ts) for a complete REST API with CRUD, middleware, and more:

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
const api_router = router();

// Define routes on the sub-router
api_router.get('/posts', () => ({
  posts: [
    { id: 1, title: 'First Post' },
    { id: 2, title: 'Second Post' }
  ]
}));

api_router.get('/posts/:id', ({ params }) => ({
  id: params.id,
  title: 'Post Title',
  content: 'Post content here...'
}));

api_router.get('/comments', () => ({
  comments: [
    { id: 1, text: 'Great post!' },
    { id: 2, text: 'Thanks for sharing' }
  ]
}));

// Mount the sub-router under /api
app.use('/api', api_router);

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