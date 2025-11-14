# BunServe

[![npm version](https://badge.fury.io/js/bunserve.svg)](https://www.npmjs.com/package/bunserve)
[![CI](https://github.com/monkfromearth/bunserve/workflows/CI/badge.svg)](https://github.com/monkfromearth/bunserve/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.2.0-black)](https://bun.sh)

**Express-like typesafe routing library built on Bun.serve with request-scoped context management.**

BunServe provides a modern, type-safe HTTP routing library for Bun that combines the simplicity of Express with enhanced TypeScript support and built-in context management using @theinternetfolks/context.

## Features

- 🚀 **Built on Bun's Native Router** - Leverages Bun.serve's native routing for <5% performance overhead
- 🔒 **Type-safe routing** - TypeScript generics for route parameter extraction
- 🌟 **Wildcard routes** - Support for `/*` and parameter routes like `/api/admin/*`
- 📦 **Request-scoped context** - Built-in context management with unique request IDs
- 🍪 **Native cookie support** - Uses Bun's built-in CookieMap API
- 🛣️ **Express-like API** - Familiar `.get()`, `.post()`, etc. syntax
- 🔄 **Middleware support** - Global and route-specific middleware chains with built-in error handling, CORS, and logging
- 📝 **Auto content detection** - Smart response formatting (JSON, text, HTML, XML, images, CSV)
- 🧪 **Comprehensive testing** - Full test coverage with `bun test`
- 📊 **Production-ready** - Error handling, health checks, metrics, and monitoring support

## Installation

```bash
bun add bunserve
```

## Quick Start

### Basic Server

```typescript
import { create_router, create_server } from 'bunserve';

// Create a new router instance
const router = create_router();

// Define routes with handlers
router.get('/hello', () => 'Hello World!');
router.get('/users/:id', ({ params }) => ({ id: params.id }));

// Create and start the server
const server = create_server({ router });
server.listen(3000);
```

### Run the Server

```bash
bun run server.ts
```

## API Reference

### Core Functions

#### `create_router()`

Creates a new router instance for defining routes.

```typescript
// Create a router to define your application routes
const router = create_router();
```

#### `create_server(config)`

Creates a new server instance with the provided configuration.

```typescript
// Create a server with custom port and host
const server = create_server({
  router,           // Router instance with your routes
  port: 3000,       // Port to listen on (default: 3000)
  host: 'localhost' // Host to bind to (default: 'localhost')
});
```

### HTTP Methods

All standard HTTP methods are supported with type-safe route parameters:

```typescript
// Define routes for different HTTP methods
router.get<Path>('/users/:id', handler);      // GET requests
router.post<Path>('/users', handler);         // POST requests
router.put<Path>('/users/:id', handler);      // PUT requests
router.patch<Path>('/users/:id', handler);    // PATCH requests
router.delete<Path>('/users/:id', handler);   // DELETE requests
router.options<Path>('/users', handler);      // OPTIONS requests
router.head<Path>('/users', handler);         // HEAD requests
router.all<Path>('/users/:id', handler);      // Matches all HTTP methods
```

### Route Parameters

Route parameters are automatically extracted and type-safe:

```typescript
// Define route with multiple parameters
router.get('/users/:id/posts/:post_id', ({ params }) => {
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
import { create_router, error_handler, HttpError } from 'bunserve';

const router = create_router();

// Add error handler middleware (should be first!)
// This catches all errors thrown in your routes
router.use(error_handler({
  include_stack: process.env.NODE_ENV === 'development' // Show stack traces in dev
}));

router.get('/users/:id', ({ params }) => {
  // Find user in your database/array
  const user = users.find(u => u.id === params.id);

  // Throw structured HTTP errors
  if (!user) {
    throw HttpError.not_found('User not found');
  }

  return user;
});
```

**HttpError factory methods:**
- `HttpError.bad_request(message, details?)` - 400
- `HttpError.unauthorized(message?)` - 401
- `HttpError.forbidden(message?)` - 403
- `HttpError.not_found(message?)` - 404
- `HttpError.conflict(message, details?)` - 409
- `HttpError.internal(message?)` - 500

### CORS Middleware

Enable Cross-Origin Resource Sharing:

```typescript
import { cors, cors_presets } from 'bunserve';

// Development preset - allows localhost origins
router.use(cors_presets.development());

// Production preset - explicit allowed origins only
router.use(cors({
  origin: ['https://example.com'],                      // Allowed origins
  credentials: true,                                     // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],            // Allowed methods
  allowed_headers: ['Content-Type', 'Authorization']    // Allowed headers
}));
```

### Logger Middleware

Request logging with multiple formats:

```typescript
import { logger, logger_presets } from 'bunserve';

// Development logging - colorful output for easy reading
router.use(logger_presets.development());

// Production logging - includes timestamps for production logs
router.use(logger_presets.production());

// Custom logging configuration
router.use(logger({
  format: 'dev',                          // Log format: 'dev', 'combined', 'common'
  skip: (path) => path === '/health'      // Skip logging for specific paths
}));
```

## Health Checks

Create health check endpoints for monitoring:

```typescript
import { create_health_check, simple_health_check } from 'bunserve';

// Simple health check - returns { status: 'ok', timestamp }
router.get('/health', simple_health_check());

// Advanced health check with dependency checks
router.get('/health/full', create_health_check({
  checks: {
    // Check if database is accessible
    database: async () => {
      return await checkDatabase(); // Your database check function
    },
    // Check if Redis is accessible
    redis: async () => {
      return await checkRedis(); // Your Redis check function
    }
  },
  include_system_info: true // Include CPU, memory, uptime in response
}));
```

## Custom Middleware

Add your own middleware that runs for all routes:

```typescript
// Global middleware - runs for every request
router.use(async (context, next) => {
  console.log('Request received:', context.request.url);
  await next(); // Call next middleware or route handler
});

// Route-specific middleware - only runs for specific routes
const auth_middleware = async (context, next) => {
  // Check for authentication token in headers
  const token = context.request.headers.get('authorization');

  if (!token) {
    // Throw error if no token provided
    throw HttpError.unauthorized();
  }

  // Continue to next middleware/handler if authenticated
  await next();
};

// Apply middleware to specific route
router.get('/protected', [auth_middleware], () => {
  return 'Protected content';
});
```

### Response Configuration

Control response formatting using the `set` object:

```typescript
router.get('/api/data', ({ set }) => {
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
router.get('/text', ({ set }) => {
  set.content = 'text'; // Force text/plain content type
  return 'Plain text response';
});

// JSON response (auto-detected for objects)
router.get('/json', ({ set }) => {
  set.content = 'json'; // Force application/json
  return { message: 'JSON response' };
});

// HTML response
router.get('/html', ({ set }) => {
  set.content = 'html'; // Force text/html content type
  return '<h1>Hello World</h1>';
});
```

### Context Integration

Access request-scoped context anywhere in your application:

```typescript
router.get('/context', () => {
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
router.post('/api/users', async ({ body }) => {
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
router.get('/api/admin/*', ({ params }) => {
  const resource = params['*'];  // Captures the wildcard part
  return { admin_resource: resource };
});

// Specific routes take precedence over wildcards
router.get('/api/admin/dashboard', () => {
  return { page: 'dashboard' };
});
```

## Cookie Management

BunServe uses Bun's native cookie API for efficient cookie management:

```typescript
// Setting cookies on login
router.post('/login', ({ request, cookies }) => {
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
router.get('/profile', ({ cookies }) => {
  // Read cookie value
  const session_id = cookies.get('session_id');
  return { session_id };
});

// Deleting cookies on logout
router.post('/logout', ({ cookies }) => {
  // Remove the session cookie
  cookies.delete('session_id', { path: '/' });
  return { success: true };
});
```

## Query Parameters

Access query parameters easily:

```typescript
// Handle search with query parameters
router.get('/search', ({ query }) => {
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
import { create_router, create_server } from 'bunserve';

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

const router = create_router();

// Get all users
router.get('/users', () => users);

// Get user by ID with error handling
router.get('/users/:id', ({ params, set }) => {
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
router.post('/users', async ({ body, set }) => {
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

// Create and start server
const server = create_server({ router });
server.listen(3000);
```

### Middleware Example

```typescript
import { create_router, create_server } from 'bunserve';

const router = create_router();

// Logging middleware - tracks request duration
router.use(async (context, next) => {
  const start = Date.now();
  await next(); // Process the request
  const duration = Date.now() - start;
  console.log(`${context.request.method} ${context.request.url} - ${duration}ms`);
});

// CORS middleware - allow cross-origin requests
router.use(async (context, next) => {
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
router.get('/protected', [require_auth], () => {
  return { message: 'Protected data' };
});

// Create and start server
const server = create_server({ router });
server.listen(3000);
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