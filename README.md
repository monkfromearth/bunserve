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
import { create_router, create_server } from 'bunserve'

const router = create_router()

router.get('/hello', () => 'Hello World!')
router.get('/users/:id', ({ params }) => ({ id: params.id }))

const server = create_server({ router })
server.listen(3000)
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
const router = create_router()
```

#### `create_server(config)`

Creates a new server instance with the provided configuration.

```typescript
const server = create_server({ 
  router,
  port: 3000,
  host: 'localhost'
})
```

### HTTP Methods

All standard HTTP methods are supported with type-safe route parameters:

```typescript
router.get<Path>('/users/:id', handler)
router.post<Path>('/users', handler)
router.put<Path>('/users/:id', handler)
router.patch<Path>('/users/:id', handler)
router.delete<Path>('/users/:id', handler)
router.options<Path>('/users', handler)
router.head<Path>('/users', handler)
router.all<Path>('/users/:id', handler) // Matches all HTTP methods
```

### Route Parameters

Route parameters are automatically extracted and type-safe:

```typescript
router.get('/users/:id/posts/:post_id', ({ params }) => {
  // params is typed as { id: string; post_id: string }
  return { 
    user_id: params.id, 
    post_id: params.post_id 
  }
})
```

### Built-in Middleware

BunServe includes production-ready middleware out of the box:

### Error Handler

Catch and format errors with structured error responses:

```typescript
import { create_router, error_handler, HttpError } from 'bunserve'

const router = create_router()

// Add error handler (should be first!)
router.use(error_handler({
  include_stack: process.env.NODE_ENV === 'development'
}))

router.get('/users/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id)
  if (!user) {
    throw HttpError.not_found('User not found')
  }
  return user
})
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
import { cors, cors_presets } from 'bunserve'

// Development (allows localhost)
router.use(cors_presets.development())

// Production (explicit origins)
router.use(cors({
  origin: ['https://example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowed_headers: ['Content-Type', 'Authorization']
}))
```

### Logger Middleware

Request logging with multiple formats:

```typescript
import { logger, logger_presets } from 'bunserve'

// Development logging with colors
router.use(logger_presets.development())

// Production logging with timestamps
router.use(logger_presets.production())

// Custom logging
router.use(logger({
  format: 'dev',
  skip: (path) => path === '/health'
}))
```

## Health Checks

Create health check endpoints for monitoring:

```typescript
import { create_health_check, simple_health_check } from 'bunserve'

// Simple health check
router.get('/health', simple_health_check())

// Advanced health check with dependency checks
router.get('/health/full', create_health_check({
  checks: {
    database: async () => {
      // Check database connection
      return await checkDatabase()
    },
    redis: async () => {
      // Check Redis connection
      return await checkRedis()
    }
  },
  include_system_info: true
}))
```

## Custom Middleware

Add your own middleware that runs for all routes:

```typescript
// Global middleware
router.use(async (context, next) => {
  console.log('Request received:', context.request.url)
  await next()
})

// Route-specific middleware
const auth_middleware = async (context, next) => {
  const token = context.request.headers.get('authorization')
  if (!token) {
    throw HttpError.unauthorized()
  }
  await next()
}

router.get('/protected', [auth_middleware], () => {
  return 'Protected content'
})
```

### Response Configuration

Control response formatting using the `set` object:

```typescript
router.get('/api/data', ({ set }) => {
  set.status = 201
  set.headers['X-Custom-Header'] = 'value'
  set.cache = '1h'
  
  return { created: true }
})
```

### Content Types

Auto-detect content type or specify explicitly:

```typescript
router.get('/text', ({ set }) => {
  set.content = 'text'
  return 'Plain text response'
})

router.get('/json', ({ set }) => {
  set.content = 'json'
  return { message: 'JSON response' }
})

router.get('/html', ({ set }) => {
  set.content = 'html'
  return '<h1>Hello World</h1>'
})
```

### Context Integration

Access request-scoped context anywhere in your application:

```typescript
router.get('/context', () => {
  const context = Context.get<{
    request_id: string
    start_time: number
    request: {
      method: string
      url: string
      headers: Record<string, string>
    }
  }>()
  
  return {
    request_id: context.request_id,
    method: context.request.method,
    duration: Date.now() - context.start_time
  }
})
```

### Request Body Parsing

Automatic body parsing for JSON and form data:

```typescript
router.post('/api/users', async ({ body }) => {
  // body is automatically parsed based on Content-Type
  return { 
    received: true, 
    user: body 
  }
})
```

## Wildcard Routes

Support for wildcard routes to match multiple paths:

```typescript
// Match all paths under /api/admin/
router.get('/api/admin/*', ({ params }) => {
  const resource = params['*']  // e.g., 'users', 'settings', etc.
  return { admin_resource: resource }
})

// Specific routes take precedence
router.get('/api/admin/dashboard', () => {
  return { page: 'dashboard' }
})
```

## Cookie Management

BunServe uses Bun's native cookie API for efficient cookie management:

```typescript
router.post('/login', ({ request, cookies }) => {
  // Set a cookie using Bun's CookieMap
  cookies.set('session_id', 'abc123', {
    httpOnly: true,
    secure: true,
    maxAge: 3600,
    path: '/'
  })

  return { success: true }
})

router.get('/profile', ({ cookies }) => {
  // Read cookies
  const session_id = cookies.get('session_id')
  return { session_id }
})

router.post('/logout', ({ cookies }) => {
  // Delete cookies
  cookies.delete('session_id', { path: '/' })
  return { success: true }
})
```

## Query Parameters

Access query parameters easily:

```typescript
router.get('/search', ({ query }) => {
  const search_term = query.q || ''
  const page = parseInt(query.page || '1')

  return {
    query: search_term,
    page,
    results: [] // Your search results
  }
})

// GET /search?q=hello&page=2
```

## Documentation

Comprehensive documentation is available in the [docs/docs](./docs/docs) directory:

- **[Getting Started](./docs/docs/getting-started.md)** - Installation and first steps
- **[Routing Guide](./docs/docs/routing.md)** - Complete routing patterns and best practices
- **[Middleware](./docs/docs/middleware.md)** - Built-in and custom middleware
- **[Error Handling](./docs/docs/error-handling.md)** - Error handling patterns and HttpError usage
- **[Cookies & Sessions](./docs/docs/cookies.md)** - Cookie management and session handling
- **[Examples](./docs/docs/examples.md)** - Real-world examples (REST API, auth, file uploads, WebSocket, database)
- **[API Reference](./docs/docs/api-reference.md)** - Complete API documentation

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
import { create_router, create_server } from 'bunserve'

interface User {
  id: string
  name: string
  email: string
}

const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' }
]

const router = create_router()

// Get all users
router.get('/users', () => users)

// Get user by ID
router.get('/users/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id)
  if (!user) {
    const { set } = context
    set.status = 404
    return { error: 'User not found' }
  }
  return user
})

// Create new user
router.post('/users', async ({ body }) => {
  const new_user: User = {
    id: String(users.length + 1),
    name: body.name,
    email: body.email
  }
  users.push(new_user)
  
  const { set } = context
  set.status = 201
  return new_user
})

const server = create_server({ router })
server.listen(3000)
```

### Middleware Example

```typescript
import { create_router, create_server } from 'bunserve'

const router = create_router()

// Logging middleware
router.use(async (context, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  console.log(`${context.request.method} ${context.request.url} - ${duration}ms`)
})

// CORS middleware
router.use(async (context, next) => {
  context.set.headers['Access-Control-Allow-Origin'] = '*'
  context.set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
  context.set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
  await next()
})

// Auth middleware
const require_auth = async (context, next) => {
  const auth_header = context.request.headers.get('authorization')
  if (!auth_header || !auth_header.startsWith('Bearer ')) {
    context.set.status = 401
    return { error: 'Unauthorized' }
  }
  await next()
}

router.get('/protected', [require_auth], () => {
  return { message: 'Protected data' }
})

const server = create_server({ router })
server.listen(3000)
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