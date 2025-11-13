# Getting Started with BunServe

This guide will walk you through creating your first BunServe application.

## Prerequisites

- **Bun** v1.2.0 or higher
- Basic TypeScript knowledge
- Familiarity with HTTP concepts

## Installation

Create a new project and install BunServe:

```bash
# Create a new directory
mkdir my-api
cd my-api

# Initialize Bun project
bun init

# Install BunServe
bun add bunserve
```

## Your First Server

Create a file called `server.ts`:

```typescript
import { create_router, create_server } from 'bunserve'

// Create a router instance
const router = create_router()

// Add a simple route
router.get('/', () => {
  return 'Welcome to BunServe!'
})

// Add a JSON route
router.get('/api/status', () => {
  return {
    status: 'online',
    timestamp: new Date().toISOString()
  }
})

// Create and start the server
const server = create_server({
  router,
  port: 3000
})

server.listen()
```

Run your server:

```bash
bun run server.ts
```

Visit `http://localhost:3000` in your browser!

## Adding More Routes

### Route Parameters

Extract values from the URL:

```typescript
router.get('/users/:id', ({ params }) => {
  return {
    message: `User ID: ${params.id}`
  }
})

// Multiple parameters
router.get('/posts/:postId/comments/:commentId', ({ params }) => {
  return {
    post: params.postId,
    comment: params.commentId
  }
})
```

### Query Parameters

Access query string values:

```typescript
router.get('/search', ({ query }) => {
  const searchTerm = query.q || ''
  const page = parseInt(query.page || '1')

  return {
    searching_for: searchTerm,
    page: page,
    results: [] // Your search results here
  }
})

// GET /search?q=hello&page=2
```

### Request Body

Handle POST/PUT requests with body data:

```typescript
router.post('/api/users', async ({ body, set }) => {
  // body is automatically parsed based on Content-Type
  const user = {
    id: crypto.randomUUID(),
    name: body.name,
    email: body.email
  }

  // Set 201 Created status
  set.status = 201

  return user
})
```

Test it:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

## Response Types

BunServe automatically detects response types:

```typescript
// JSON (auto-detected for objects)
router.get('/json', () => {
  return { message: 'JSON response' }
})

// Plain text (auto-detected for strings)
router.get('/text', () => {
  return 'Plain text response'
})

// HTML
router.get('/html', ({ set }) => {
  set.content = 'html'
  return '<h1>Hello World</h1>'
})

// Custom status code
router.get('/not-found', ({ set }) => {
  set.status = 404
  return { error: 'Not found' }
})

// Redirect
router.get('/old-path', ({ set }) => {
  set.redirect = '/new-path'
})
```

## Adding Middleware

Middleware runs before your route handlers:

```typescript
import { logger } from 'bunserve'

const router = create_router()

// Global middleware - runs for all routes
router.use(logger({ format: 'dev' }))

// Custom middleware
router.use(async ({ request }, next) => {
  console.log(`${request.method} ${request.url}`)
  await next()
})

// Route-specific middleware
const auth_middleware = async ({ request, set }, next) => {
  const token = request.headers.get('authorization')

  if (!token) {
    set.status = 401
    return { error: 'Unauthorized' }
  }

  await next()
}

router.get('/protected', [auth_middleware], () => {
  return { message: 'Protected data' }
})
```

## Error Handling

Handle errors gracefully:

```typescript
import { error_handler, HttpError } from 'bunserve'

const router = create_router()

// Add error handler first
router.use(error_handler())

// Throw structured errors
router.get('/user/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id)

  if (!user) {
    throw HttpError.not_found('User not found')
  }

  return user
})

// Errors are automatically caught and formatted
```

## Working with Cookies

Use Bun's native cookie API:

```typescript
router.post('/login', ({ body, cookies }) => {
  // Authenticate user...

  // Set a cookie
  cookies.set('session_id', 'abc123', {
    httpOnly: true,
    secure: true,
    maxAge: 3600, // 1 hour
    path: '/'
  })

  return { success: true }
})

router.get('/profile', ({ cookies }) => {
  const session_id = cookies.get('session_id')

  if (!session_id) {
    return { error: 'Not logged in' }
  }

  return { session_id }
})

router.post('/logout', ({ cookies }) => {
  cookies.delete('session_id', { path: '/' })
  return { success: true }
})
```

## Complete Example

Here's a complete REST API example:

```typescript
import { create_router, create_server, logger, error_handler, HttpError } from 'bunserve'

// In-memory data store
const users = new Map<string, { id: string; name: string; email: string }>()

const router = create_router()

// Middleware
router.use(logger({ format: 'dev' }))
router.use(error_handler())

// Routes
router.get('/api/users', () => {
  return { users: Array.from(users.values()) }
})

router.get('/api/users/:id', ({ params }) => {
  const user = users.get(params.id)

  if (!user) {
    throw HttpError.not_found('User not found')
  }

  return user
})

router.post('/api/users', async ({ body, set }) => {
  const id = crypto.randomUUID()
  const user = { id, name: body.name, email: body.email }

  users.set(id, user)
  set.status = 201

  return user
})

router.put('/api/users/:id', async ({ params, body }) => {
  const user = users.get(params.id)

  if (!user) {
    throw HttpError.not_found('User not found')
  }

  user.name = body.name || user.name
  user.email = body.email || user.email
  users.set(params.id, user)

  return user
})

router.delete('/api/users/:id', ({ params, set }) => {
  const deleted = users.delete(params.id)

  if (!deleted) {
    throw HttpError.not_found('User not found')
  }

  set.status = 204
  return null
})

// Start server
const server = create_server({ router, port: 3000 })
server.listen()
```

Save this as `api.ts` and run:

```bash
bun run api.ts
```

Test the API:

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

# Get all users
curl http://localhost:3000/api/users

# Get specific user (use the ID from create response)
curl http://localhost:3000/api/users/{id}

# Update user
curl -X PUT http://localhost:3000/api/users/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Updated"}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/{id}
```

## Next Steps

Now that you have a basic server running, explore more features:

- **[Routing Guide](./routing.md)** - Advanced routing patterns including wildcards
- **[Middleware](./middleware.md)** - CORS, authentication, rate limiting
- **[Response Handling](./responses.md)** - Different content types and file serving
- **[Error Handling](./error-handling.md)** - Advanced error handling patterns
- **[Examples](./examples.md)** - Real-world example applications

## Common Patterns

### Health Check Endpoint

```typescript
import { create_health_check } from 'bunserve'

router.get('/health', create_health_check({
  checks: {
    database: async () => {
      // Return true if database is accessible
      return true
    }
  }
}))
```

### CORS Support

```typescript
import { cors } from 'bunserve'

router.use(cors({
  origin: ['https://example.com'],
  credentials: true
}))
```

### Request Context

Access request-scoped data anywhere:

```typescript
import { Context } from 'bunserve'

router.use(async ({}, next) => {
  const ctx = Context.get<{ request_id: string; start_time: number }>()
  console.log(`Request ID: ${ctx.request_id}`)
  await next()
})
```

## Troubleshooting

### Port Already in Use

If you see "address already in use", change the port:

```typescript
const server = create_server({ router, port: 3001 })
```

### TypeScript Errors

Make sure you have Bun's type definitions:

```bash
bun add -d @types/bun
```

### Performance Issues

BunServe uses Bun's native router for optimal performance. If you're experiencing issues:

1. Avoid heavy computation in route handlers
2. Use middleware for common operations
3. Consider caching frequently accessed data
4. Profile your application with `bun --inspect`

## Need Help?

- Check the [API Reference](./api-reference.md)
- Browse [Examples](./examples.md)
- Read about [Best Practices](./best-practices.md)
- Open an issue on [GitHub](https://github.com/yourusername/bunserve)
