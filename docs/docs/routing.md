# Routing Guide

Complete guide to routing in BunServe, including parameters, wildcards, and advanced patterns.

## Basic Routes

Define routes using HTTP method functions:

```typescript
import { create_router } from 'bunserve'

const router = create_router()

// GET request
router.get('/users', () => {
  return { users: [] }
})

// POST request
router.post('/users', async ({ body }) => {
  return { created: true, user: body }
})

// PUT request
router.put('/users/:id', async ({ params, body }) => {
  return { updated: true, id: params.id }
})

// DELETE request
router.delete('/users/:id', ({ params }) => {
  return { deleted: true, id: params.id }
})

// PATCH request
router.patch('/users/:id', async ({ params, body }) => {
  return { patched: true, id: params.id }
})

// OPTIONS request
router.options('/users', () => {
  return null // Usually handled by CORS middleware
})

// HEAD request
router.head('/users', () => {
  return null // Response body ignored, only headers sent
})

// All HTTP methods
router.all('/admin', () => {
  return { admin: true }
})
```

## Route Parameters

Extract dynamic values from the URL path:

### Single Parameter

```typescript
router.get('/users/:id', ({ params }) => {
  // GET /users/123 -> params.id = "123"
  return { user_id: params.id }
})
```

### Multiple Parameters

```typescript
router.get('/users/:userId/posts/:postId', ({ params }) => {
  // GET /users/123/posts/456
  // params.userId = "123"
  // params.postId = "456"
  return {
    user: params.userId,
    post: params.postId
  }
})
```

### Type Safety

TypeScript automatically infers parameter types:

```typescript
router.get('/posts/:postId/comments/:commentId', ({ params }) => {
  // TypeScript knows: params = { postId: string; commentId: string }
  // Autocomplete works!
  const postId: string = params.postId
  const commentId: string = params.commentId

  return { postId, commentId }
})
```

### Parameter Validation

Validate parameters in your handler:

```typescript
router.get('/users/:id', ({ params }) => {
  const id = parseInt(params.id)

  if (isNaN(id)) {
    throw HttpError.bad_request('Invalid user ID')
  }

  return { user_id: id }
})
```

## Wildcard Routes

Match multiple paths with wildcard patterns:

### Basic Wildcard

```typescript
// Matches /api/anything, /api/foo/bar, etc.
router.get('/api/*', ({ params }) => {
  const path = params['*'] // Everything after /api/

  return {
    matched: 'wildcard',
    path: path
  }
})

// Examples:
// GET /api/users -> path = "users"
// GET /api/users/123 -> path = "users/123"
// GET /api/admin/settings -> path = "admin/settings"
```

### Wildcard with Prefix

```typescript
// Admin routes
router.get('/admin/*', [requireAdmin], ({ params }) => {
  const resource = params['*']

  return {
    admin_resource: resource
  }
})

// API versioning
router.get('/api/v*/*', ({ params }) => {
  // Captures version and path
  return {
    version: params['*'].split('/')[0],
    path: params['*'].split('/').slice(1).join('/')
  }
})
```

### Route Precedence

More specific routes take precedence over wildcards:

```typescript
// These are matched in order of specificity:

// 1. Exact match (most specific)
router.get('/api/users/me', () => {
  return { current_user: true }
})

// 2. Parameter match
router.get('/api/users/:id', ({ params }) => {
  return { user_id: params.id }
})

// 3. Wildcard match (least specific)
router.get('/api/*', ({ params }) => {
  return { wildcard: params['*'] }
})

// GET /api/users/me -> Matches route 1
// GET /api/users/123 -> Matches route 2
// GET /api/posts -> Matches route 3
```

## Query Parameters

Access URL query strings:

```typescript
router.get('/search', ({ query }) => {
  const searchTerm = query.q || ''
  const page = parseInt(query.page || '1')
  const limit = parseInt(query.limit || '10')
  const sortBy = query.sort || 'created_at'

  return {
    query: searchTerm,
    page,
    limit,
    sort: sortBy,
    results: [] // Your search results
  }
})

// GET /search?q=hello&page=2&limit=20&sort=name
```

### Multiple Values

Handle query parameters with multiple values:

```typescript
router.get('/filter', ({ request }) => {
  const url = new URL(request.url)
  const tags = url.searchParams.getAll('tag')

  return {
    tags: tags, // ['javascript', 'typescript', 'bun']
    filtered_results: []
  }
})

// GET /filter?tag=javascript&tag=typescript&tag=bun
```

## Request Body

Handle different content types:

### JSON Body

```typescript
router.post('/api/users', async ({ body, set }) => {
  // body is automatically parsed for application/json
  const user = {
    id: crypto.randomUUID(),
    name: body.name,
    email: body.email,
    created_at: new Date().toISOString()
  }

  set.status = 201
  return user
})
```

### Form Data

```typescript
router.post('/upload', async ({ body }) => {
  // body is automatically parsed for application/x-www-form-urlencoded
  return {
    received: {
      username: body.username,
      password: body.password
    }
  }
})
```

### Multipart Form Data

```typescript
router.post('/upload-file', async ({ body }) => {
  // body is FormData for multipart/form-data
  const file = body.get('file') as File

  return {
    filename: file.name,
    size: file.size,
    type: file.type
  }
})
```

### Raw Body

```typescript
router.post('/webhook', async ({ body }) => {
  // body is the raw text for other content types
  return {
    received: body.length,
    data: body
  }
})
```

## Route Groups

Organize related routes:

```typescript
// User routes
const setupUserRoutes = (router: Router) => {
  router.get('/api/users', () => { /* ... */ })
  router.get('/api/users/:id', ({ params }) => { /* ... */ })
  router.post('/api/users', async ({ body }) => { /* ... */ })
  router.put('/api/users/:id', async ({ params, body }) => { /* ... */ })
  router.delete('/api/users/:id', ({ params }) => { /* ... */ })
}

// Post routes
const setupPostRoutes = (router: Router) => {
  router.get('/api/posts', () => { /* ... */ })
  router.get('/api/posts/:id', ({ params }) => { /* ... */ })
  router.post('/api/posts', async ({ body }) => { /* ... */ })
}

// Apply to router
const router = create_router()
setupUserRoutes(router)
setupPostRoutes(router)
```

## Sub-Routers

Create modular route definitions:

```typescript
// users-router.ts
export function createUserRouter() {
  const router = create_router()

  router.get('/users', () => ({ users: [] }))
  router.get('/users/:id', ({ params }) => ({ id: params.id }))
  router.post('/users', async ({ body }) => ({ created: true }))

  return router
}

// posts-router.ts
export function createPostRouter() {
  const router = create_router()

  router.get('/posts', () => ({ posts: [] }))
  router.get('/posts/:id', ({ params }) => ({ id: params.id }))

  return router
}

// main.ts
import { createUserRouter } from './users-router'
import { createPostRouter } from './posts-router'

const router = create_router()

// Apply sub-routers
const userRouter = createUserRouter()
const postRouter = createPostRouter()

// Copy routes to main router
// (Note: BunServe will support this natively in future versions)
```

## Route Metadata

Add metadata to routes for documentation:

```typescript
// Using JSDoc comments
/**
 * Get user by ID
 * @route GET /api/users/:id
 * @param {string} id - User ID
 * @returns {User} User object
 */
router.get('/api/users/:id', ({ params }) => {
  return getUserById(params.id)
})

// Or create a wrapper
function documentedRoute<T>(
  method: string,
  path: string,
  description: string,
  handler: RouteHandler<T>
) {
  console.log(`Registered: ${method} ${path} - ${description}`)
  return handler
}

router.get('/api/users/:id',
  documentedRoute('GET', '/api/users/:id', 'Get user by ID',
    ({ params }) => getUserById(params.id)
  )
)
```

## RESTful Patterns

Follow REST conventions:

```typescript
// Collection operations
router.get('/api/users', () => {
  // List all users
  return { users: [] }
})

router.post('/api/users', async ({ body }) => {
  // Create new user
  return { user: body }
})

// Resource operations
router.get('/api/users/:id', ({ params }) => {
  // Get specific user
  return { user: { id: params.id } }
})

router.put('/api/users/:id', async ({ params, body }) => {
  // Replace user
  return { user: body }
})

router.patch('/api/users/:id', async ({ params, body }) => {
  // Update user partially
  return { user: body }
})

router.delete('/api/users/:id', ({ params, set }) => {
  // Delete user
  set.status = 204
  return null
})

// Nested resources
router.get('/api/users/:userId/posts', ({ params }) => {
  // List user's posts
  return { posts: [] }
})

router.post('/api/users/:userId/posts', async ({ params, body }) => {
  // Create post for user
  return { post: body }
})
```

## Advanced Patterns

### Versioned APIs

```typescript
// V1 routes
router.get('/api/v1/users', () => {
  return { version: 1, users: [] }
})

// V2 routes with breaking changes
router.get('/api/v2/users', () => {
  return {
    version: 2,
    data: [],
    meta: { total: 0 }
  }
})

// Dynamic version handling
router.get('/api/v*/users', ({ request }) => {
  const version = new URL(request.url).pathname.match(/v(\d+)/)?.[1]

  return {
    version: version,
    users: []
  }
})
```

### Conditional Routes

```typescript
const isDevelopment = process.env.NODE_ENV === 'development'

if (isDevelopment) {
  router.get('/debug/routes', () => {
    // Return all registered routes (for debugging)
    return { routes: [] }
  })
}
```

### Dynamic Route Registration

```typescript
const resources = ['users', 'posts', 'comments']

for (const resource of resources) {
  router.get(`/api/${resource}`, () => {
    return { resource, items: [] }
  })

  router.get(`/api/${resource}/:id`, ({ params }) => {
    return { resource, id: params.id }
  })
}
```

## Best Practices

### 1. Use Type-Safe Parameters

```typescript
// Good
router.get('/users/:id', ({ params }) => {
  const userId = params.id // Type-safe!
  return { userId }
})

// Avoid
router.get('/users/:id', ({ request }) => {
  // Manual parsing, no type safety
  const userId = new URL(request.url).pathname.split('/')[2]
})
```

### 2. Validate Input

```typescript
router.post('/api/users', async ({ body, set }) => {
  if (!body.email || !body.name) {
    set.status = 400
    return { error: 'Email and name are required' }
  }

  // Process valid input
  return { user: body }
})
```

### 3. Use Wildcards Sparingly

```typescript
// Good: Specific routes for common cases
router.get('/api/users', () => { /* ... */ })
router.get('/api/users/:id', ({ params }) => { /* ... */ })

// Use wildcards for catch-all or admin routes
router.get('/api/admin/*', [requireAdmin], ({ params }) => {
  // Handle any admin route
})
```

### 4. Document Your Routes

```typescript
/**
 * User API
 *
 * GET    /api/users       - List all users
 * GET    /api/users/:id   - Get user by ID
 * POST   /api/users       - Create new user
 * PUT    /api/users/:id   - Update user
 * DELETE /api/users/:id   - Delete user
 */
```

## Next Steps

- **[Middleware](./middleware.md)** - Add authentication, logging, and more
- **[Response Handling](./responses.md)** - Different response types
- **[Error Handling](./error-handling.md)** - Handle errors gracefully
- **[Examples](./examples.md)** - Complete example applications
