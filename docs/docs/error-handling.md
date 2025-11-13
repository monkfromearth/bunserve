# Error Handling Guide

Comprehensive guide to error handling in BunServe, from basic error responses to production-ready error management.

## Quick Start

```typescript
import { create_router, error_handler, HttpError } from 'bunserve'

const router = create_router()

// Add error handler middleware (should be first!)
router.use(error_handler())

// Throw structured errors
router.get('/user/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id)

  if (!user) {
    throw HttpError.not_found('User not found')
  }

  return user
})
```

## HttpError Class

BunServe provides a structured `HttpError` class for throwing HTTP errors:

### Factory Methods

```typescript
// 400 Bad Request
throw HttpError.bad_request('Invalid email format')
throw HttpError.bad_request('Validation failed', {
  errors: {
    email: 'Invalid format',
    age: 'Must be a number'
  }
})

// 401 Unauthorized
throw HttpError.unauthorized()
throw HttpError.unauthorized('Invalid credentials')

// 403 Forbidden
throw HttpError.forbidden()
throw HttpError.forbidden('Insufficient permissions')

// 404 Not Found
throw HttpError.not_found()
throw HttpError.not_found('User not found')

// 409 Conflict
throw HttpError.conflict('Email already exists')

// 500 Internal Server Error
throw HttpError.internal()
throw HttpError.internal('Database connection failed')
```

### Custom Status Codes

```typescript
// Any HTTP status code
throw new HttpError(418, "I'm a teapot")
throw new HttpError(503, 'Service temporarily unavailable')
```

### Error with Details

```typescript
throw HttpError.bad_request('Validation failed', {
  fields: ['email', 'password'],
  messages: {
    email: 'Invalid email format',
    password: 'Password too short'
  }
})

// Response:
// {
//   "error": "Validation failed",
//   "status": 400,
//   "details": {
//     "fields": ["email", "password"],
//     "messages": {
//       "email": "Invalid email format",
//       "password": "Password too short"
//     }
//   }
// }
```

## Error Handler Middleware

### Basic Usage

```typescript
import { error_handler } from 'bunserve'

router.use(error_handler())

// All errors are now caught and formatted
router.get('/fail', () => {
  throw new Error('Something went wrong')
})

// Response:
// {
//   "error": "Something went wrong"
// }
```

### Configuration

```typescript
router.use(error_handler({
  // Include stack traces (default: true in dev, false in prod)
  include_stack: process.env.NODE_ENV === 'development',

  // Custom error formatter
  format_error: (error, context) => {
    if (error instanceof HttpError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.status,
          details: error.details
        }
      }
    }

    return {
      success: false,
      error: {
        message: 'Internal server error',
        code: 500
      }
    }
  },

  // Custom error logger
  log_error: (error, context) => {
    // Send to error tracking service
    console.error({
      message: error.message,
      stack: error.stack,
      url: context.request.url,
      method: context.request.method
    })
  }
}))
```

## Error Response Format

### Default Format

```json
{
  "error": "User not found",
  "status": 404
}
```

### With Details

```json
{
  "error": "Validation failed",
  "status": 400,
  "details": {
    "field": "email"
  }
}
```

### With Stack Trace (Development)

```json
{
  "error": "Database connection failed",
  "status": 500,
  "stack": "Error: Database connection failed\n    at ..."
}
```

## Validation Errors

### Input Validation

```typescript
router.post('/api/users', async ({ body, set }) => {
  // Validate required fields
  if (!body.email || !body.password) {
    throw HttpError.bad_request('Email and password are required', {
      missing_fields: !body.email ? ['email'] : ['password']
    })
  }

  // Validate email format
  if (!isValidEmail(body.email)) {
    throw HttpError.bad_request('Invalid email format', {
      field: 'email'
    })
  }

  // Validate password strength
  if (body.password.length < 8) {
    throw HttpError.bad_request('Password must be at least 8 characters', {
      field: 'password',
      min_length: 8
    })
  }

  // Create user
  const user = await createUser(body)
  set.status = 201
  return user
})
```

### Using Validation Libraries

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
})

router.post('/api/users', async ({ body }) => {
  try {
    const validated = UserSchema.parse(body)
    return await createUser(validated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw HttpError.bad_request('Validation failed', {
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      })
    }
    throw error
  }
})
```

## Database Errors

### Handling Database Errors

```typescript
router.get('/user/:id', async ({ params }) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [params.id])

    if (!user) {
      throw HttpError.not_found('User not found')
    }

    return user
  } catch (error) {
    if (error.code === 'CONNECTION_ERROR') {
      throw HttpError.internal('Database connection failed')
    }

    throw error
  }
})
```

### Unique Constraint Violations

```typescript
router.post('/api/users', async ({ body }) => {
  try {
    const user = await db.insert('users', body)
    return user
  } catch (error) {
    if (error.code === 'UNIQUE_VIOLATION') {
      throw HttpError.conflict('Email already exists', {
        field: 'email',
        value: body.email
      })
    }

    throw error
  }
})
```

## Authentication Errors

```typescript
const authenticate = async ({ request, set }, next) => {
  const token = request.headers.get('authorization')

  if (!token) {
    throw HttpError.unauthorized('No authorization token provided')
  }

  try {
    const user = await verifyToken(token)
    Context.set({ user })
    await next()
  } catch (error) {
    throw HttpError.unauthorized('Invalid or expired token')
  }
}

const requireAdmin = async ({}, next) => {
  const { user } = Context.get<{ user: User }>()

  if (!user.is_admin) {
    throw HttpError.forbidden('Admin access required')
  }

  await next()
}

router.get('/admin/users', [authenticate, requireAdmin], () => {
  return { users: [] }
})
```

## Async Error Handling

Async errors are automatically caught:

```typescript
router.get('/async-fail', async () => {
  // This error is caught by error handler middleware
  const data = await fetchFromAPI()
  throw new Error('Something went wrong')
})

router.get('/promise-fail', () => {
  // Promise rejections are also caught
  return Promise.reject(new Error('Promise rejected'))
})
```

## Error Recovery

### Fallback Values

```typescript
router.get('/user/:id', async ({ params }) => {
  try {
    const user = await getUserFromCache(params.id)
    return user
  } catch (cacheError) {
    // Fallback to database
    try {
      const user = await getUserFromDB(params.id)
      return user
    } catch (dbError) {
      throw HttpError.not_found('User not found')
    }
  }
})
```

### Retry Logic

```typescript
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url)
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}

router.get('/external-data', async () => {
  try {
    const data = await fetchWithRetry('https://api.example.com/data')
    return data
  } catch (error) {
    throw HttpError.internal('Failed to fetch external data')
  }
})
```

## Custom Error Classes

```typescript
class ValidationError extends HttpError {
  constructor(message: string, public fields: Record<string, string>) {
    super(400, message, { fields })
    this.name = 'ValidationError'
  }
}

class DatabaseError extends HttpError {
  constructor(message: string, public query?: string) {
    super(500, message, { query })
    this.name = 'DatabaseError'
  }
}

// Usage
router.post('/api/users', async ({ body }) => {
  const errors: Record<string, string> = {}

  if (!body.email) errors.email = 'Email is required'
  if (!body.password) errors.password = 'Password is required'

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors)
  }

  try {
    return await createUser(body)
  } catch (error) {
    throw new DatabaseError('Failed to create user', error.query)
  }
})
```

## Error Logging

### Structured Logging

```typescript
router.use(error_handler({
  log_error: (error, context) => {
    const log_entry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: {
        method: context.request.method,
        url: context.request.url,
        headers: Object.fromEntries(context.request.headers.entries())
      },
      context: Context.get()
    }

    // Send to logging service
    console.error(JSON.stringify(log_entry))
  }
}))
```

### Error Tracking Services

```typescript
import * as Sentry from '@sentry/bun'

Sentry.init({
  dsn: process.env.SENTRY_DSN
})

router.use(error_handler({
  log_error: (error, context) => {
    Sentry.captureException(error, {
      contexts: {
        request: {
          method: context.request.method,
          url: context.request.url
        }
      }
    })
  }
}))
```

## Error Responses by Status Code

### Client Errors (4xx)

```typescript
// 400 Bad Request - Invalid input
throw HttpError.bad_request('Invalid request parameters')

// 401 Unauthorized - Authentication required
throw HttpError.unauthorized('Please log in')

// 403 Forbidden - Authenticated but not authorized
throw HttpError.forbidden('Access denied')

// 404 Not Found - Resource doesn't exist
throw HttpError.not_found('Page not found')

// 409 Conflict - Resource conflict
throw HttpError.conflict('Resource already exists')

// 422 Unprocessable Entity - Semantic errors
throw new HttpError(422, 'Unable to process request')

// 429 Too Many Requests - Rate limit exceeded
throw new HttpError(429, 'Rate limit exceeded')
```

### Server Errors (5xx)

```typescript
// 500 Internal Server Error - General error
throw HttpError.internal('Something went wrong')

// 503 Service Unavailable - Temporary issue
throw new HttpError(503, 'Service temporarily unavailable')

// 504 Gateway Timeout - Upstream timeout
throw new HttpError(504, 'Request timeout')
```

## Testing Error Handling

```typescript
import { test, expect } from 'bun:test'
import { create_router, create_server, error_handler, HttpError } from 'bunserve'

test('handles 404 errors', async () => {
  const router = create_router()
  router.use(error_handler())

  router.get('/fail', () => {
    throw HttpError.not_found('Not found')
  })

  const server = create_server({ router })
  const response = await server.fetch(new Request('http://localhost/fail'))

  expect(response.status).toBe(404)
  const data = await response.json()
  expect(data.error).toBe('Not found')
})

test('handles validation errors', async () => {
  const router = create_router()
  router.use(error_handler())

  router.post('/validate', ({ body }) => {
    if (!body.email) {
      throw HttpError.bad_request('Email required', { field: 'email' })
    }
    return { success: true }
  })

  const server = create_server({ router })
  const response = await server.fetch(
    new Request('http://localhost/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
  )

  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error).toBe('Email required')
  expect(data.details.field).toBe('email')
})
```

## Best Practices

### 1. Use Error Handler Middleware First

```typescript
// Good
router.use(error_handler())
router.use(cors())
router.use(logger())

// Bad - errors from other middleware won't be caught
router.use(cors())
router.use(logger())
router.use(error_handler())
```

### 2. Use Specific Error Types

```typescript
// Good
throw HttpError.not_found('User not found')

// Avoid
throw new Error('User not found') // Becomes 500, not 404
```

### 3. Include Helpful Details

```typescript
// Good
throw HttpError.bad_request('Validation failed', {
  fields: ['email', 'password'],
  errors: {
    email: 'Invalid format',
    password: 'Too short'
  }
})

// Less helpful
throw HttpError.bad_request('Invalid input')
```

### 4. Don't Expose Sensitive Information

```typescript
// Good
throw HttpError.internal('Database error')

// Bad - exposes internal details
throw HttpError.internal(`Database error: ${error.message}`)
```

### 5. Log All Errors

```typescript
router.use(error_handler({
  log_error: (error, context) => {
    // Always log errors for debugging
    console.error({
      error: error.message,
      url: context.request.url,
      timestamp: new Date().toISOString()
    })
  }
}))
```

## Next Steps

- **[Middleware](./middleware.md)** - Learn about middleware patterns
- **[Examples](./examples.md)** - Complete error handling examples
- **[API Reference](./api-reference.md)** - Full API documentation
