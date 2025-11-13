# BunServe Documentation

**Express-like typesafe routing library built on Bun's native router.**

BunServe is a modern, high-performance HTTP routing library for Bun that combines the simplicity of Express with the speed of Bun's native routing system.

## Why BunServe?

- =€ **Native Performance** - Built directly on Bun.serve's native router for minimal overhead (<5%)
- = **Type-Safe** - Full TypeScript support with automatic parameter type inference
- < **Wildcard Routes** - Support for flexible routing patterns like `/api/*`
- <j **Native Cookies** - Uses Bun's built-in CookieMap for efficient cookie management
- =ã **Express-like API** - Familiar routing patterns for easy migration
- = **Middleware System** - Global and route-specific middleware with error handling
- =æ **Zero Dependencies** - Only depends on Bun and context management

## Quick Start

### Installation

```bash
bun add bunserve
```

### Basic Example

```typescript
import { create_router, create_server } from 'bunserve'

const router = create_router()

// Simple routes
router.get('/', () => 'Hello World!')

// Route parameters
router.get('/users/:id', ({ params }) => {
  return { user_id: params.id }
})

// JSON responses
router.post('/api/users', async ({ body }) => {
  return { created: true, user: body }
})

const server = create_server({ router })
server.listen(3000)
```

### Run the Server

```bash
bun run server.ts
```

Visit `http://localhost:3000` to see your server in action!

## Core Concepts

### Router

The router is the heart of BunServe. It registers routes and builds them into Bun's native routing format for optimal performance.

```typescript
import { create_router } from 'bunserve'

const router = create_router()

// HTTP methods
router.get('/path', handler)
router.post('/path', handler)
router.put('/path', handler)
router.delete('/path', handler)
router.patch('/path', handler)
router.options('/path', handler)
router.head('/path', handler)
router.all('/path', handler) // All methods
```

### Route Handlers

Route handlers receive a context object with request information and helper methods:

```typescript
router.get('/example', ({ request, params, query, body, cookies, set }) => {
  // request: The full BunRequest object
  // params: URL parameters (/users/:id -> params.id)
  // query: Query string parameters (?foo=bar -> query.foo)
  // body: Parsed request body (JSON, form data, etc.)
  // cookies: Bun's native CookieMap for cookie management
  // set: Response configuration (status, headers, content type, etc.)

  return { success: true }
})
```

### Type Safety

BunServe automatically infers route parameter types:

```typescript
router.get('/users/:userId/posts/:postId', ({ params }) => {
  // TypeScript knows: params = { userId: string; postId: string }
  return {
    user: params.userId,
    post: params.postId
  }
})
```

## Next Steps

Explore the documentation to learn more:

- **[Getting Started](./getting-started.md)** - Detailed setup and first steps
- **[Routing Guide](./routing.md)** - Learn about routes, parameters, and wildcards
- **[Middleware](./middleware.md)** - Global and route-specific middleware
- **[Response Handling](./responses.md)** - Different response types and helpers
- **[Error Handling](./error-handling.md)** - Structured error handling
- **[Cookies & Sessions](./cookies.md)** - Working with cookies
- **[Examples](./examples.md)** - Complete working examples
- **[API Reference](./api-reference.md)** - Complete API documentation

## Example Projects

- **[REST API](../examples/rest-api.ts)** - Complete REST API with CRUD operations
- **[Middleware Stack](./examples.md#middleware-stack)** - CORS, logging, auth, and error handling
- **[Health Checks](./examples.md#health-checks)** - Production-ready health endpoints

## Community

- **GitHub**: [Report issues](https://github.com/yourusername/bunserve/issues)
- **Documentation**: [Full docs](https://bunserve.dev)
- **Examples**: [Example projects](./examples.md)

## License

MIT License - See LICENSE file for details.
