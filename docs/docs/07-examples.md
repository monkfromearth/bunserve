# Examples

Complete, real-world examples demonstrating BunServe features.

## Table of Contents

- [Simple REST API](#simple-rest-api)
- [Authentication System](#authentication-system)
- [File Upload API](#file-upload-api)
- [Middleware Stack](#middleware-stack)
- [Health Checks](#health-checks)
- [WebSocket Integration](#websocket-integration)
- [Database Integration](#database-integration)

## Simple REST API

Complete CRUD API with in-memory storage:

```typescript
// Import necessary BunServe utilities for REST API
import { create_router, create_server, error_handler, HttpError, logger } from 'bunserve';

// Data store - in-memory Map for fast lookups
const users = new Map<string, User>();

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const router = create_router();

// Middleware - runs for all routes
// Error handler catches and formats all errors
router.use(error_handler());
// Logger logs all requests in dev format
router.use(logger({ format: 'dev' }));

// List all users with count
router.get('/api/users', () => {
  return {
    users: Array.from(users.values()),
    total: users.size
  };
});

// Get user by ID
router.get('/api/users/:id', ({ params }) => {
  const user = users.get(params.id);

  if (!user) {
    // Throw 404 if user not found
    throw HttpError.not_found('User not found');
  }

  return user;
});

// Create user with validation
router.post('/api/users', async ({ body, set }) => {
  // Validation - check required fields
  if (!body.name || !body.email) {
    throw HttpError.bad_request('Name and email are required');
  }

  // Validate email format with regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw HttpError.bad_request('Invalid email format');
  }

  // Create new user with generated ID
  const id = crypto.randomUUID();
  const user: User = {
    id,
    name: body.name,
    email: body.email,
    created_at: new Date().toISOString()
  };

  users.set(id, user);
  set.status = 201; // 201 Created

  return user;
});

// Update user - partial update
router.put('/api/users/:id', async ({ params, body }) => {
  const user = users.get(params.id);

  if (!user) {
    throw HttpError.not_found('User not found');
  }

  // Update only provided fields
  if (body.name) user.name = body.name;
  if (body.email) user.email = body.email;

  users.set(params.id, user);

  return user;
});

// Delete user
router.delete('/api/users/:id', ({ params, set }) => {
  if (!users.delete(params.id)) {
    throw HttpError.not_found('User not found');
  }

  set.status = 204; // 204 No Content
  return null;
});

// Search users by name or email
router.get('/api/users/search', ({ query }) => {
  const term = (query.q || '').toLowerCase();

  // Filter users by search term
  const results = Array.from(users.values()).filter(user =>
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term)
  );

  return {
    query: term,
    results,
    count: results.length
  };
});

// Create and start the server
const server = create_server({ router, port: 3000 });
server.listen();
```

## Authentication System

JWT-based authentication with protected routes:

```typescript
import { create_router, create_server, Context, HttpError } from 'bunserve'
import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface User {
  id: string
  email: string
  password_hash: string
}

const users = new Map<string, User>()

// Authentication middleware
const authenticate = async ({ request }, next) => {
  const auth_header = request.headers.get('authorization')

  if (!auth_header?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('No token provided')
  }

  const token = auth_header.slice(7)

  try {
    const payload = verify(token, JWT_SECRET) as { user_id: string; email: string }
    const user = users.get(payload.user_id)

    if (!user) {
      throw HttpError.unauthorized('Invalid token')
    }

    Context.set({ user })
    await next()
  } catch (error) {
    throw HttpError.unauthorized('Invalid or expired token')
  }
}

const router = create_router()

// Public routes
router.post('/auth/register', async ({ body, set }) => {
  if (!body.email || !body.password) {
    throw HttpError.bad_request('Email and password required')
  }

  // Check if user exists
  const existing = Array.from(users.values()).find(u => u.email === body.email)
  if (existing) {
    throw HttpError.conflict('Email already registered')
  }

  // Hash password (use bcrypt in production)
  const password_hash = await Bun.password.hash(body.password)

  const user: User = {
    id: crypto.randomUUID(),
    email: body.email,
    password_hash
  }

  users.set(user.id, user)
  set.status = 201

  return {
    message: 'User registered successfully',
    user: { id: user.id, email: user.email }
  }
})

router.post('/auth/login', async ({ body }) => {
  if (!body.email || !body.password) {
    throw HttpError.bad_request('Email and password required')
  }

  const user = Array.from(users.values()).find(u => u.email === body.email)
  if (!user) {
    throw HttpError.unauthorized('Invalid credentials')
  }

  const valid = await Bun.password.verify(body.password, user.password_hash)
  if (!valid) {
    throw HttpError.unauthorized('Invalid credentials')
  }

  const token = sign(
    { user_id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  return {
    token,
    user: { id: user.id, email: user.email }
  }
})

// Protected routes
router.get('/auth/me', [authenticate], () => {
  const { user } = Context.get<{ user: User }>()

  return {
    id: user.id,
    email: user.email
  }
})

router.post('/auth/logout', [authenticate], () => {
  // In production, you'd invalidate the token server-side
  return { message: 'Logged out successfully' }
})

const server = create_server({ router, port: 3000 })
server.listen()
```

## File Upload API

Handle file uploads with validation:

```typescript
import { create_router, create_server, HttpError } from 'bunserve'
import { mkdir, write } from 'node:fs/promises'
import { join } from 'node:path'

const UPLOAD_DIR = './uploads'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']

// Ensure upload directory exists
await mkdir(UPLOAD_DIR, { recursive: true })

const router = create_router()

// Upload single file
router.post('/upload', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    throw HttpError.bad_request('Request must be multipart/form-data')
  }

  const file = body.get('file') as File
  if (!file) {
    throw HttpError.bad_request('No file provided')
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw HttpError.bad_request('File too large (max 5MB)')
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw HttpError.bad_request('Invalid file type')
  }

  // Save file
  const filename = `${Date.now()}-${file.name}`
  const filepath = join(UPLOAD_DIR, filename)

  const buffer = await file.arrayBuffer()
  await write(filepath, new Uint8Array(buffer))

  set.status = 201

  return {
    filename,
    size: file.size,
    type: file.type,
    url: `/uploads/${filename}`
  }
})

// Upload multiple files
router.post('/upload/multiple', async ({ body }) => {
  if (!(body instanceof FormData)) {
    throw HttpError.bad_request('Request must be multipart/form-data')
  }

  const files = body.getAll('files') as File[]
  if (files.length === 0) {
    throw HttpError.bad_request('No files provided')
  }

  const uploaded = []

  for (const file of files) {
    // Validate
    if (file.size > MAX_FILE_SIZE) {
      throw HttpError.bad_request(`File ${file.name} too large`)
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw HttpError.bad_request(`Invalid type for ${file.name}`)
    }

    // Save
    const filename = `${Date.now()}-${file.name}`
    const filepath = join(UPLOAD_DIR, filename)

    const buffer = await file.arrayBuffer()
    await write(filepath, new Uint8Array(buffer))

    uploaded.push({
      filename,
      size: file.size,
      type: file.type,
      url: `/uploads/${filename}`
    })
  }

  return { files: uploaded, count: uploaded.length }
})

// Serve uploaded files
router.get('/uploads/:filename', ({ params }) => {
  const filepath = join(UPLOAD_DIR, params.filename)
  return new Response(Bun.file(filepath))
})

const server = create_server({ router, port: 3000 })
server.listen()
```

## Middleware Stack

Production-ready middleware configuration:

```typescript
import {
  create_router,
  create_server,
  error_handler,
  cors,
  logger,
  HttpError,
  Context
} from 'bunserve'

const router = create_router()

// 1. Error handling (first!)
router.use(error_handler({
  include_stack: process.env.NODE_ENV === 'development',
  log_error: (error, context) => {
    console.error({
      timestamp: new Date().toISOString(),
      error: error.message,
      url: context.request.url,
      method: context.request.method,
      request_id: Context.get()?.request_id
    })
  }
}))

// 2. CORS
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowed_headers: ['Content-Type', 'Authorization']
}))

// 3. Request logging
router.use(logger({
  format: process.env.NODE_ENV === 'development' ? 'dev' : 'combined',
  skip: (path) => path === '/health' || path === '/metrics'
}))

// 4. Request ID
router.use(async ({ set }, next) => {
  const request_id = crypto.randomUUID()
  set.headers['X-Request-ID'] = request_id
  Context.set({ request_id })
  await next()
})

// 5. Rate limiting
const rate_limits = new Map<string, { count: number; reset: number }>()

router.use(async ({ request, set }, next) => {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const limit = rate_limits.get(ip)

  if (limit && now < limit.reset) {
    if (limit.count >= 100) {
      set.status = 429
      throw HttpError.too_many_requests('Rate limit exceeded')
    }
    limit.count++
  } else {
    rate_limits.set(ip, { count: 1, reset: now + 15 * 60 * 1000 })
  }

  await next()
})

// 6. Response time
router.use(async ({ set }, next) => {
  const start = performance.now()
  await next()
  const duration = performance.now() - start
  set.headers['X-Response-Time'] = `${duration.toFixed(2)}ms`
})

// Routes
router.get('/api/data', () => ({ data: 'Hello World' }))

const server = create_server({ router, port: 3000 })
server.listen()
```

## Health Checks

Production-ready health check endpoint:

```typescript
import { create_router, create_server, create_health_check } from 'bunserve'
import { Database } from 'bun:sqlite'

const db = new Database('app.db')
const redis = connectToRedis() // Your Redis client

const router = create_router()

// Basic health check
router.get('/health', create_health_check())

// Health check with dependencies
router.get('/health/full', create_health_check({
  checks: {
    database: async () => {
      try {
        db.query('SELECT 1').get()
        return true
      } catch {
        return false
      }
    },

    redis: async () => {
      try {
        await redis.ping()
        return true
      } catch {
        return false
      }
    },

    memory: () => {
      const usage = process.memoryUsage()
      return usage.heapUsed < usage.heapTotal * 0.9
    },

    disk_space: async () => {
      // Check available disk space
      const { available } = await checkDiskSpace('/')
      return available > 1024 * 1024 * 1024 // 1GB
    }
  },

  include_system_info: true
}))

// Liveness probe (Kubernetes)
router.get('/health/live', () => {
  return { status: 'alive' }
})

// Readiness probe (Kubernetes)
router.get('/health/ready', create_health_check({
  checks: {
    database: async () => {
      try {
        db.query('SELECT 1').get()
        return true
      } catch {
        return false
      }
    }
  }
}))

const server = create_server({ router, port: 3000 })
server.listen()
```

## WebSocket Integration

Combine HTTP routes with WebSocket:

```typescript
import { create_router, create_server } from 'bunserve'

const router = create_router()
const connections = new Set<any>()

// HTTP routes
router.get('/', ({ set }) => {
  set.content = 'html'
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>WebSocket Chat</h1>
        <div id="messages"></div>
        <input id="input" type="text" />
        <button onclick="send()">Send</button>
        <script>
          const ws = new WebSocket('ws://localhost:3000/ws')

          ws.onmessage = (e) => {
            document.getElementById('messages').innerHTML += '<div>' + e.data + '</div>'
          }

          function send() {
            const input = document.getElementById('input')
            ws.send(input.value)
            input.value = ''
          }
        </script>
      </body>
    </html>
  `
})

router.get('/api/stats', () => {
  return {
    connections: connections.size,
    uptime: process.uptime()
  }
})

const server = create_server({ router, port: 3000 })

// Add WebSocket support
const bun_server = Bun.serve({
  port: 3000,
  routes: router.build_routes(),

  websocket: {
    open(ws) {
      connections.add(ws)
      ws.send('Welcome to the chat!')
    },

    message(ws, message) {
      // Broadcast to all connections
      for (const conn of connections) {
        conn.send(message)
      }
    },

    close(ws) {
      connections.delete(ws)
    }
  },

  fetch(req, server) {
    // Upgrade HTTP to WebSocket
    if (req.url.endsWith('/ws')) {
      if (server.upgrade(req)) {
        return undefined
      }
      return new Response('Upgrade failed', { status: 400 })
    }

    // Handle HTTP routes
    return router.handle_request(req)
  }
})
```

## Database Integration

Using Bun's built-in SQLite:

```typescript
import { create_router, create_server, HttpError } from 'bunserve'
import { Database } from 'bun:sqlite'

const db = new Database('app.db')

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
  )
`)

const router = create_router()

// List users with pagination
router.get('/api/users', ({ query }) => {
  const page = parseInt(query.page || '1')
  const limit = parseInt(query.limit || '10')
  const offset = (page - 1) * limit

  const users = db.query(`
    SELECT * FROM users
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)

  const total = db.query('SELECT COUNT(*) as count FROM users').get()

  return {
    users,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit)
    }
  }
})

// Get user
router.get('/api/users/:id', ({ params }) => {
  const user = db.query('SELECT * FROM users WHERE id = ?').get(params.id)

  if (!user) {
    throw HttpError.not_found('User not found')
  }

  return user
})

// Create user
router.post('/api/users', async ({ body, set }) => {
  const id = crypto.randomUUID()

  try {
    db.query(`
      INSERT INTO users (id, name, email, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, body.name, body.email, new Date().toISOString())

    const user = db.query('SELECT * FROM users WHERE id = ?').get(id)
    set.status = 201
    return user
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      throw HttpError.conflict('Email already exists')
    }
    throw error
  }
})

const server = create_server({ router, port: 3000 })
server.listen()
```

## Next Steps

- **[Getting Started](./02-getting-started.md)** - Basic setup
- **[Routing Guide](./03-routing.md)** - Advanced routing
- **[Middleware](./04-middleware.md)** - Middleware patterns
- **[API Reference](./08-api-reference.md)** - Complete API docs
