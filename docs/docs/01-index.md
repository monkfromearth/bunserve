# BunServe Documentation

**Express-like typesafe routing library built on Bun's native router.**

BunServe is a modern, high-performance HTTP routing library for Bun that combines the simplicity of Express with the speed of Bun's native routing system.

## Why BunServe?

- =� **Native Performance** - Built directly on Bun.serve's native router for minimal overhead (<5%)
- = **Type-Safe** - Full TypeScript support with automatic parameter type inference
- < **Wildcard Routes** - Support for flexible routing patterns like `/api/*`
- <j **Native Cookies** - Uses Bun's built-in CookieMap for efficient cookie management
- =� **Express-like API** - Familiar routing patterns for easy migration
- = **Middleware System** - Global and route-specific middleware with error handling
- =� **Zero Dependencies** - Only depends on Bun and context management

## Quick Start

### Installation

```bash
bun add bunserve
```

### Basic Example

```typescript
// Import the router and server creation functions from BunServe
import { create_router, create_server } from 'bunserve';

// Create a new router instance to register routes
const router = create_router();

// Simple routes
// Define a GET route that returns a plain text greeting
router.get('/', () => 'Hello World!');

// Route parameters
// Define a GET route with a dynamic :id parameter to fetch a specific user
router.get('/users/:id', ({ params }) => {
  return { user_id: params.id };
});

// JSON responses
// Define a POST route to create a new user, automatically parsing the JSON body
router.post('/api/users', async ({ body }) => {
  return { created: true, user: body };
});

// Create the HTTP server with the configured router
const server = create_server({ router });
// Start the server listening on port 3000
server.listen(3000);
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
import { create_router } from 'bunserve';

const router = create_router();

// HTTP methods
// Register a GET route for retrieving resources
router.get('/path', handler);
// Register a POST route for creating resources
router.post('/path', handler);
// Register a PUT route for updating/replacing resources
router.put('/path', handler);
// Register a DELETE route for removing resources
router.delete('/path', handler);
// Register a PATCH route for partially updating resources
router.patch('/path', handler);
// Register an OPTIONS route for CORS preflight requests
router.options('/path', handler);
// Register a HEAD route for getting headers without body
router.head('/path', handler);
// Register a route that matches all HTTP methods
router.all('/path', handler);
```

### Route Handlers

Route handlers receive a context object with request information and helper methods:

```typescript
router.get('/example', ({ request, params, query, body, cookies, set }) => {
  // request: The full BunRequest object with all HTTP details
  // params: URL parameters (/users/:id -> params.id)
  // query: Query string parameters (?foo=bar -> query.foo)
  // body: Parsed request body (JSON, form data, etc.)
  // cookies: Bun's native CookieMap for cookie management
  // set: Response configuration (status, headers, content type, etc.)

  return { success: true };
});
```

### Type Safety

BunServe automatically infers route parameter types:

```typescript
// TypeScript automatically infers the types of route parameters
router.get('/users/:userId/posts/:postId', ({ params }) => {
  // TypeScript knows: params = { userId: string; postId: string }
  // Access the userId and postId parameters with full type safety
  return {
    user: params.userId,
    post: params.postId
  };
});
```

## Next Steps

Explore the documentation to learn more:

- **[Getting Started](./02-getting-started.md)** - Detailed setup and first steps
- **[Routing Guide](./03-routing.md)** - Learn about routes, parameters, and wildcards
- **[Middleware](./04-middleware.md)** - Global and route-specific middleware
- **[Error Handling](./05-error-handling.md)** - Structured error handling
- **[Cookies & Sessions](./06-cookies.md)** - Working with cookies
- **[Examples](./07-examples.md)** - Complete working examples
- **[API Reference](./08-api-reference.md)** - Complete API documentation

## Example Projects

- **[REST API](../examples/rest-api.ts)** - Complete REST API with CRUD operations
- **[Middleware Stack](./07-examples.md#middleware-stack)** - CORS, logging, auth, and error handling
- **[Health Checks](./07-examples.md#health-checks)** - Production-ready health endpoints

## Community

- **GitHub**: [Report issues](https://github.com/yourusername/bunserve/issues)
- **Documentation**: [Full docs](https://bunserve.dev)
- **Examples**: [Example projects](./07-examples.md)

## License

MIT License - See LICENSE file for details.
