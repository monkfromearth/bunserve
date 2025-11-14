# Best Practices

Production-ready best practices for building robust, secure, and maintainable applications with BunServe.

## Table of Contents

- [Project Structure](#project-structure)
- [Error Handling](#error-handling)
- [Security](#security)
- [Performance](#performance)
- [Testing](#testing)
- [Logging](#logging)
- [Configuration](#configuration)
- [Database Integration](#database-integration)
- [Deployment](#deployment)

## Project Structure

Organize your BunServe application for maintainability and scalability:

### Recommended Structure

```
my-app/
├── src/
│   ├── index.ts              # App entry point
│   ├── config/
│   │   └── env.ts            # Environment configuration
│   ├── routes/
│   │   ├── users.ts          # User routes
│   │   ├── posts.ts          # Post routes
│   │   └── index.ts          # Route aggregator
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── validate.ts       # Validation middleware
│   │   └── rate-limit.ts     # Rate limiting middleware
│   ├── services/
│   │   ├── user-service.ts   # Business logic for users
│   │   └── post-service.ts   # Business logic for posts
│   ├── models/
│   │   ├── user.ts           # User model and types
│   │   └── post.ts           # Post model and types
│   └── utils/
│       ├── errors.ts         # Custom error classes
│       └── validation.ts     # Validation helpers
├── test/
│   ├── routes/               # Route tests
│   ├── services/             # Service tests
│   └── integration/          # Integration tests
├── .env                      # Environment variables (not in git!)
├── .env.example              # Example environment variables
├── package.json
└── tsconfig.json
```

### Entry Point (src/index.ts)

```typescript
import { bunserve, error_handler, cors, logger, security } from 'bunserve';
import { user_routes } from './routes/users';
import { post_routes } from './routes/posts';
import { config } from './config/env';

// Create application instance
const app = bunserve();

// Middleware (order matters!)
app.use(error_handler({
  include_stack: config.is_development
}));
app.use(security());
app.use(cors({
  preset: config.is_production ? 'production' : 'development',
  allowed_origins: config.allowed_origins
}));
app.use(logger({
  preset: config.is_production ? 'production' : 'development'
}));

// Health check endpoint
app.get('/health', () => ({
  status: 'ok',
  environment: config.env,
  timestamp: new Date().toISOString()
}));

// Mount route modules
app.use('/api/users', user_routes);
app.use('/api/posts', post_routes);

// Start server
app.listen(config.port);
console.log(`Server running on port ${config.port}`);
```

### Route Modules (src/routes/users.ts)

```typescript
import { router } from 'bunserve';
import { get_all_users, get_user_by_id, create_user } from '../services/user-service';
import { validate_user_input } from '../middleware/validate';

// Create sub-router for user routes
export const user_routes = router();

// List all users with pagination
user_routes.get('/', async ({ query }) => {
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');

  return await get_all_users(page, limit);
});

// Get user by ID
user_routes.get('/:id', async ({ params }) => {
  return await get_user_by_id(params.id);
});

// Create new user with validation
user_routes.post('/', [validate_user_input], async ({ body }) => {
  return await create_user(body);
});
```

## Error Handling

### Use Consistent Error Format

```typescript
// src/utils/errors.ts

// Define custom error classes with status codes
export class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

// Usage in routes
import { NotFoundError, ValidationError } from '../utils/errors';

app.get('/users/:id', async ({ params }) => {
  const user = await find_user(params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
});

app.post('/users', async ({ body }) => {
  if (!body.email) {
    throw new ValidationError('Email is required', {
      field: 'email'
    });
  }

  return await create_user(body);
});
```

### Async Error Handling

```typescript
// Wrap async operations in try-catch blocks
app.get('/external-data', async () => {
  try {
    const data = await fetch_from_external_api();
    return data;
  } catch (error) {
    // Log the error for debugging
    console.error('External API error:', error);

    // Throw user-friendly error
    throw new AppError('Failed to fetch data', 503);
  }
});

// Use Promise.all with proper error handling
app.get('/dashboard', async () => {
  try {
    const [users, posts, stats] = await Promise.all([
      fetch_users(),
      fetch_posts(),
      fetch_stats()
    ]);

    return { users, posts, stats };
  } catch (error) {
    console.error('Dashboard error:', error);
    throw new AppError('Failed to load dashboard', 500);
  }
});
```

## Security

### Input Validation

```typescript
// Validate all user inputs
app.post('/api/users', async ({ body }) => {
  // Validate email format
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new ValidationError('Invalid email format');
  }

  // Validate password strength
  if (!body.password || body.password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  // Sanitize inputs
  const user = {
    email: body.email.toLowerCase().trim(),
    name: body.name.trim(),
    password: await hash_password(body.password)
  };

  return await create_user(user);
});
```

### Use Security Headers

```typescript
import { security } from 'bunserve';

// Production security configuration
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],            // No inline scripts
      'style-src': ["'self'"],             // No inline styles
      'img-src': ["'self'", 'https:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"]        // No framing allowed
    }
  },
  strict_transport_security: {
    max_age: 31536000,                     // 1 year
    include_sub_domains: true,
    preload: true
  },
  frame_options: 'DENY',
  remove_powered_by: true
}));
```

### Authentication Best Practices

```typescript
// Use HTTP-only cookies for tokens
app.post('/login', async ({ body, cookies }) => {
  const user = await authenticate(body.email, body.password);

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate JWT token
  const token = await sign_jwt({
    user_id: user.id,
    email: user.email
  });

  // Set secure HTTP-only cookie
  cookies.set('auth_token', token, {
    httpOnly: true,              // Prevents JavaScript access
    secure: true,                // HTTPS only
    sameSite: 'strict',          // CSRF protection
    maxAge: 7 * 24 * 60 * 60    // 7 days
  });

  return { success: true };
});

// Verify authentication in middleware
const require_auth = async ({ request, cookies }, next) => {
  const token = cookies.get('auth_token');

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  try {
    const payload = await verify_jwt(token);
    Context.set({ user_id: payload.user_id });
    await next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
```

### Rate Limiting

```typescript
// src/middleware/rate-limit.ts

const rate_limits = new Map<string, { count: number; reset: number }>();

export function rate_limit(max_requests: number, window_ms: number) {
  return async ({ request, set }, next) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    const limit = rate_limits.get(ip);

    if (limit && now < limit.reset) {
      if (limit.count >= max_requests) {
        set.status = 429;
        set.headers['Retry-After'] = String(Math.ceil((limit.reset - now) / 1000));

        throw new AppError('Too many requests', 429);
      }
      limit.count++;
    } else {
      // New window
      rate_limits.set(ip, {
        count: 1,
        reset: now + window_ms
      });
    }

    await next();
  };
}

// Usage: 100 requests per 15 minutes
app.use(rate_limit(100, 15 * 60 * 1000));
```

## Performance

### Use Caching

```typescript
// Cache static responses
app.get('/api/config', ({ set }) => {
  set.cache = '1h';  // Cache for 1 hour
  return {
    api_version: '1.0',
    features: ['auth', 'posts', 'comments']
  };
});

// Cache static assets
app.get('/assets/:filename', ({ params, set }) => {
  set.cache = '1y';  // Cache for 1 year with immutable assets
  return new Response(Bun.file(`./public/${params.filename}`));
});

// Don't cache dynamic data
app.get('/api/realtime', ({ set }) => {
  set.cache = 'no-cache';
  return {
    timestamp: Date.now(),
    data: get_realtime_data()
  };
});
```

### Database Query Optimization

```typescript
// Bad: N+1 query problem
app.get('/posts', async () => {
  const posts = await db.query('SELECT * FROM posts').all();

  // Each post triggers a separate query!
  for (const post of posts) {
    post.author = await db.query('SELECT * FROM users WHERE id = ?').get(post.user_id);
  }

  return posts;
});

// Good: Use JOINs or batch queries
app.get('/posts', async () => {
  const posts = await db.query(`
    SELECT posts.*, users.name as author_name
    FROM posts
    JOIN users ON posts.user_id = users.id
  `).all();

  return posts;
});

// Use database indexes
// CREATE INDEX idx_posts_user_id ON posts(user_id);
// CREATE INDEX idx_posts_created_at ON posts(created_at);
```

### Pagination

```typescript
// Always paginate large datasets
app.get('/api/users', async ({ query }) => {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, parseInt(query.limit || '20'));  // Cap at 100
  const offset = (page - 1) * limit;

  const users = await db.query(`
    SELECT * FROM users
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = await db.query('SELECT COUNT(*) as count FROM users').get();

  return {
    data: users,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit)
    }
  };
});
```

## Testing

### Test Structure

```typescript
import { test, expect, beforeEach, afterEach } from 'bun:test';
import { bunserve } from 'bunserve';

let app;

beforeEach(() => {
  // Create fresh app for each test
  app = bunserve();
});

afterEach(async () => {
  // Clean up after each test
  await app.close();
});

test('GET /users/:id returns user', async () => {
  // Setup
  app.get('/users/:id', ({ params }) => ({
    id: params.id,
    name: 'Alice'
  }));

  // Execute
  const response = await app.fetch(new Request('http://localhost/users/123'));

  // Assert
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.id).toBe('123');
  expect(data.name).toBe('Alice');
});

test('POST /users validates input', async () => {
  app.post('/users', async ({ body, set }) => {
    if (!body.email) {
      set.status = 400;
      return { error: 'Email required' };
    }
    return { id: '1', email: body.email };
  });

  // Test with invalid input
  const bad_response = await app.fetch(
    new Request('http://localhost/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
  );

  expect(bad_response.status).toBe(400);

  // Test with valid input
  const good_response = await app.fetch(
    new Request('http://localhost/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com' })
    })
  );

  expect(good_response.status).toBe(200);
});
```

## Logging

### Structured Logging

```typescript
// Use structured logging for better debugging
import { logger } from 'bunserve';

// Production logging
app.use(logger({
  preset: 'production',
  skip: (path) => path === '/health'  // Skip health checks
}));

// Custom logging with context
app.use(async ({ request }, next) => {
  const start = Date.now();
  const request_id = crypto.randomUUID();

  // Store request_id in context
  Context.set({ request_id });

  try {
    await next();
  } finally {
    // Log with structured data
    console.log(JSON.stringify({
      request_id,
      method: request.method,
      url: request.url,
      duration: Date.now() - start,
      timestamp: new Date().toISOString()
    }));
  }
});
```

## Configuration

### Environment Variables

```typescript
// src/config/env.ts

// Define configuration with validation
export const config = {
  env: process.env.NODE_ENV || 'development',
  is_development: process.env.NODE_ENV === 'development',
  is_production: process.env.NODE_ENV === 'production',

  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',

  database_url: process.env.DATABASE_URL || 'sqlite://app.db',

  jwt_secret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-secret-key';
  })(),

  allowed_origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],

  log_level: process.env.LOG_LEVEL || 'info'
};

// Validate required environment variables in production
if (config.is_production) {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### .env.example

```bash
# Environment
NODE_ENV=development

# Server
PORT=3000
HOST=localhost

# Database
DATABASE_URL=sqlite://app.db

# Security
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,https://example.com

# Logging
LOG_LEVEL=info
```

## Database Integration

### Use Connection Pooling

```typescript
// src/db/index.ts
import { Database } from 'bun:sqlite';

// Singleton database instance
let db_instance: Database | null = null;

export function get_database() {
  if (!db_instance) {
    db_instance = new Database(config.database_url);

    // Enable WAL mode for better concurrency
    db_instance.exec('PRAGMA journal_mode = WAL');
    db_instance.exec('PRAGMA synchronous = NORMAL');
    db_instance.exec('PRAGMA cache_size = 1000000000');
    db_instance.exec('PRAGMA temp_store = memory');
  }

  return db_instance;
}

// Close database on shutdown
export async function close_database() {
  if (db_instance) {
    db_instance.close();
    db_instance = null;
  }
}
```

### Use Transactions

```typescript
// src/services/user-service.ts

export async function create_user_with_profile(user_data, profile_data) {
  const db = get_database();

  // Use transactions for data consistency
  const insert_user = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  const insert_profile = db.prepare('INSERT INTO profiles (user_id, bio) VALUES (?, ?)');

  return db.transaction(() => {
    const user_result = insert_user.run(user_data.name, user_data.email);
    const user_id = user_result.lastInsertRowid;

    insert_profile.run(user_id, profile_data.bio);

    return { user_id, ...user_data };
  })();
}
```

## Deployment

### Graceful Shutdown

```typescript
// src/index.ts

const app = bunserve();

// Setup routes...

const server = app.listen(config.port);

// Graceful shutdown handler
async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  // Close server (stop accepting new connections)
  await server.close();

  // Close database connections
  await close_database();

  console.log('Shutdown complete');
  process.exit(0);
}

// Listen for shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### Health Checks

```typescript
// Kubernetes-style health checks
app.get('/health/live', () => ({
  status: 'alive'
}));

app.get('/health/ready', async () => {
  try {
    // Check database connection
    const db = get_database();
    db.query('SELECT 1').get();

    return { status: 'ready' };
  } catch (error) {
    return { status: 'not ready', error: error.message };
  }
});
```

## Next Steps

- **[Deployment Guide](./11-deployment.md)** - Deploy to production
- **[File Uploads](./12-file-uploads.md)** - Handle file uploads securely
- **[Migration Guides](./13-migration.md)** - Migrate from Express or Elysia
- **[API Reference](./08-api-reference.md)** - Complete API documentation
