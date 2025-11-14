# Error Handling Guide

Comprehensive guide to error handling in BunServe, from basic error responses to production-ready error management.

## Quick Start

```typescript
import { bunserve, error_handler } from 'bunserve';

const app = bunserve();

// Add error handler middleware (should be first!)
// This catches all errors thrown in route handlers and formats them
app.use(error_handler());

// Throw errors with status property in route handlers
app.get('/user/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id);

  if (!user) {
    // Throw an error with a status property
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
});
```

## Error Patterns

BunServe's error handler catches any error with a `.status` property. Here are recommended patterns:

### Basic Error with Status

```typescript
// Simple error with status property
app.get('/user/:id', ({ params }) => {
  if (!user) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }
});
```

### Custom Error Class

Create reusable error classes for your application:

```typescript
// Define a custom error class
class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Use in routes
app.get('/user/:id', ({ params }) => {
  if (!user) {
    throw new AppError('User not found', 404);
  }
});
```

### Error Factory Functions

Create factory functions for common HTTP errors:

```typescript
// Factory functions for common errors
const NotFoundError = (message: string = 'Not found') => {
  const error: any = new Error(message);
  error.status = 404;
  return error;
};

const BadRequestError = (message: string, details?: any) => {
  const error: any = new Error(message);
  error.status = 400;
  error.details = details;
  return error;
};

const UnauthorizedError = (message: string = 'Unauthorized') => {
  const error: any = new Error(message);
  error.status = 401;
  return error;
};

const ForbiddenError = (message: string = 'Forbidden') => {
  const error: any = new Error(message);
  error.status = 403;
  return error;
};

const ConflictError = (message: string, details?: any) => {
  const error: any = new Error(message);
  error.status = 409;
  error.details = details;
  return error;
};

const InternalError = (message: string = 'Internal server error') => {
  const error: any = new Error(message);
  error.status = 500;
  return error;
};

// Use in routes
app.get('/user/:id', ({ params }) => {
  if (!user) {
    throw NotFoundError('User not found');
  }
});

app.post('/users', async ({ body }) => {
  if (!body.email) {
    throw BadRequestError('Validation failed', {
      fields: ['email'],
      messages: { email: 'Email is required' }
    });
  }
});
```

### Error with Details

```typescript
// Throw error with additional details
app.post('/users', async ({ body }) => {
  const error: any = new Error('Validation failed');
  error.status = 400;
  error.details = {
    fields: ['email', 'password'],
    messages: {
      email: 'Invalid email format',
      password: 'Password too short'
    }
  };
  throw error;
});

// Response automatically includes the details:
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

app.use(error_handler())

// All errors are now caught and formatted
app.get('/fail', () => {
  throw new Error('Something went wrong')
})

// Response:
// {
//   "error": "Something went wrong"
// }
```

### Configuration

```typescript
app.use(error_handler({
  // Include stack traces (default: true in dev, false in prod)
  include_stack: process.env.NODE_ENV === 'development',

  // Custom error formatter
  format_error: (error, context) => {
    // Check if error has status property
    if (error.status) {
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
// Comprehensive input validation example
app.post('/api/users', async ({ body, set }) => {
  // Validate required fields
  if (!body.email || !body.password) {
    const error: any = new Error('Email and password are required');
    error.status = 400;
    error.details = {
      missing_fields: !body.email ? ['email'] : ['password']
    };
    throw error;
  }

  // Validate email format
  if (!isValidEmail(body.email)) {
    const error: any = new Error('Invalid email format');
    error.status = 400;
    error.details = { field: 'email' };
    throw error;
  }

  // Validate password strength
  if (body.password.length < 8) {
    const error: any = new Error('Password must be at least 8 characters');
    error.status = 400;
    error.details = {
      field: 'password',
      min_length: 8
    };
    throw error;
  }

  // Create user after validation succeeds
  const user = await createUser(body);
  set.status = 201;
  return user;
});
```

### Using Validation Libraries

```typescript
// Using Zod for schema validation
import { z } from 'zod';

// Define schema with validation rules
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});

app.post('/api/users', async ({ body }) => {
  try {
    // Validate and parse request body
    const validated = UserSchema.parse(body);
    return await createUser(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Convert Zod errors to structured error with status property
      const validation_error: any = new Error('Validation failed');
      validation_error.status = 400;
      validation_error.details = {
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      };
      throw validation_error;
    }
    throw error;
  }
});
```

## Database Errors

### Handling Database Errors

```typescript
app.get('/user/:id', async ({ params }) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [params.id])

    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    return user
  } catch (error) {
    if (error.code === 'CONNECTION_ERROR') {
      const db_error: any = new Error('Database connection failed');
      db_error.status = 500;
      throw db_error;
    }

    throw error
  }
})
```

### Unique Constraint Violations

```typescript
app.post('/api/users', async ({ body }) => {
  try {
    const user = await db.insert('users', body)
    return user
  } catch (error) {
    if (error.code === 'UNIQUE_VIOLATION') {
      const conflict_error: any = new Error('Email already exists');
      conflict_error.status = 409;
      conflict_error.details = {
        field: 'email',
        value: body.email
      };
      throw conflict_error;
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
    const error: any = new Error('No authorization token provided');
    error.status = 401;
    throw error;
  }

  try {
    const user = await verifyToken(token)
    Context.set({ user })
    await next()
  } catch (error) {
    const auth_error: any = new Error('Invalid or expired token');
    auth_error.status = 401;
    throw auth_error;
  }
}

const require_admin = async ({}, next) => {
  const { user } = Context.get<{ user: User }>()

  if (!user.is_admin) {
    const error: any = new Error('Admin access required');
    error.status = 403;
    throw error;
  }

  await next()
}

app.get('/admin/users', [authenticate, require_admin], () => {
  return { users: [] }
})
```

## Async Error Handling

Async errors are automatically caught:

```typescript
app.get('/async-fail', async () => {
  // This error is caught by error handler middleware
  const data = await fetchFromAPI()
  throw new Error('Something went wrong')
})

app.get('/promise-fail', () => {
  // Promise rejections are also caught
  return Promise.reject(new Error('Promise rejected'))
})
```

## Error Recovery

### Fallback Values

```typescript
app.get('/user/:id', async ({ params }) => {
  try {
    const user = await getUserFromCache(params.id)
    return user
  } catch (cacheError) {
    // Fallback to database
    try {
      const user = await getUserFromDB(params.id)
      return user
    } catch (dbError) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
  }
})
```

### Retry Logic

```typescript
async function fetch_with_retry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url)
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}

app.get('/external-data', async () => {
  try {
    const data = await fetch_with_retry('https://api.example.com/data')
    return data
  } catch (error) {
    const fetch_error: any = new Error('Failed to fetch external data');
    fetch_error.status = 500;
    throw fetch_error;
  }
})
```

## Custom Error Classes

```typescript
class ValidationError extends Error {
  public status = 400;
  constructor(message: string, public fields: Record<string, string>) {
    super(message)
    this.name = 'ValidationError'
  }
}

class DatabaseError extends Error {
  public status = 500;
  constructor(message: string, public query?: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Usage
app.post('/api/users', async ({ body }) => {
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
app.use(error_handler({
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

app.use(error_handler({
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
const badRequestError: any = new Error('Invalid request parameters');
badRequestError.status = 400;
throw badRequestError;

// 401 Unauthorized - Authentication required
const unauthorizedError: any = new Error('Please log in');
unauthorizedError.status = 401;
throw unauthorizedError;

// 403 Forbidden - Authenticated but not authorized
const forbiddenError: any = new Error('Access denied');
forbiddenError.status = 403;
throw forbiddenError;

// 404 Not Found - Resource doesn't exist
const notFoundError: any = new Error('Page not found');
notFoundError.status = 404;
throw notFoundError;

// 409 Conflict - Resource conflict
const conflictError: any = new Error('Resource already exists');
conflictError.status = 409;
throw conflictError;

// 422 Unprocessable Entity - Semantic errors
const unprocessableError: any = new Error('Unable to process request');
unprocessableError.status = 422;
throw unprocessableError;

// 429 Too Many Requests - Too many concurrent requests
const tooManyRequestsError: any = new Error('Too many concurrent requests');
tooManyRequestsError.status = 429;
throw tooManyRequestsError;
```

### Server Errors (5xx)

```typescript
// 500 Internal Server Error - General error
const internalError: any = new Error('Something went wrong');
internalError.status = 500;
throw internalError;

// 503 Service Unavailable - Temporary issue
const unavailableError: any = new Error('Service temporarily unavailable');
unavailableError.status = 503;
throw unavailableError;

// 504 Gateway Timeout - Upstream timeout
const timeoutError: any = new Error('Request timeout');
timeoutError.status = 504;
throw timeoutError;
```

## Testing Error Handling

```typescript
import { test, expect } from 'bun:test'
import { bunserve, error_handler } from 'bunserve'

test('handles 404 errors', async () => {
  const app = bunserve()
  app.use(error_handler())

  app.get('/fail', () => {
    const error: any = new Error('Not found');
    error.status = 404;
    throw error;
  })

  const response = await app.fetch(new Request('http://localhost/fail'))

  expect(response.status).toBe(404)
  const data = await response.json()
  expect(data.error).toBe('Not found')
})

test('handles validation errors', async () => {
  const app = bunserve()
  app.use(error_handler())

  app.post('/validate', ({ body }) => {
    if (!body.email) {
      const error: any = new Error('Email required');
      error.status = 400;
      error.details = { field: 'email' };
      throw error;
    }
    return { success: true }
  })

  const response = await app.fetch(
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
app.use(error_handler())
app.use(cors())
app.use(logger())

// Bad - errors from other middleware won't be caught
app.use(cors())
app.use(logger())
app.use(error_handler())
```

### 2. Use Specific Error Status Codes

```typescript
// Good - specify the correct HTTP status code
const error: any = new Error('User not found');
error.status = 404;
throw error;

// Avoid - missing status means 500
throw new Error('User not found') // Becomes 500, not 404
```

### 3. Include Helpful Details

```typescript
// Good - include details for client debugging
const error: any = new Error('Validation failed');
error.status = 400;
error.details = {
  fields: ['email', 'password'],
  errors: {
    email: 'Invalid format',
    password: 'Too short'
  }
};
throw error;

// Less helpful
const simpleError: any = new Error('Invalid input');
simpleError.status = 400;
throw simpleError;
```

### 4. Don't Expose Sensitive Information

```typescript
// Good - generic error message
const error: any = new Error('Database error');
error.status = 500;
throw error;

// Bad - exposes internal details
const badError: any = new Error(`Database error: ${error.message}`);
badError.status = 500;
throw badError;
```

### 5. Log All Errors

```typescript
app.use(error_handler({
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

- **[Middleware](./04-middleware.md)** - Learn about middleware patterns
- **[Examples](./07-examples.md)** - Complete error handling examples
- **[API Reference](./08-api-reference.md)** - Full API documentation
