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
import { bunserve, error_handler, logger } from 'bunserve';

// Data store - in-memory Map for fast lookups
const users = new Map<string, User>();

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const app = bunserve();

// Middleware - runs for all routes
// Error handler catches and formats all errors
app.use(error_handler());
// Logger logs all requests in dev format
app.use(logger({ format: 'dev' }));

// List all users with count
app.get('/api/users', () => {
  return {
    users: Array.from(users.values()),
    total: users.size
  };
});

// Get user by ID
// The context parameter is destructured to { params }
app.get('/api/users/:id', ({ params }) => {
  const user = users.get(params.id);

  if (!user) {
    // Throw 404 if user not found
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
});

// Create user with validation
app.post('/api/users', async ({ body, set }) => {
  // Validation - check required fields
  if (!body.name || !body.email) {
    const error: any = new Error('Name and email are required');
    error.status = 400;
    throw error;
  }

  // Validate email format with regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    const error: any = new Error('Invalid email format');
    error.status = 400;
    throw error;
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
app.put('/api/users/:id', async ({ params, body }) => {
  const user = users.get(params.id);

  if (!user) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Update only provided fields
  if (body.name) user.name = body.name;
  if (body.email) user.email = body.email;

  users.set(params.id, user);

  return user;
});

// Delete user
app.delete('/api/users/:id', ({ params, set }) => {
  if (!users.delete(params.id)) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  set.status = 204; // 204 No Content
  return null;
});

// Search users by name or email
app.get('/api/users/search', ({ query }) => {
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

// Start the server
app.listen(3000);
```

## Authentication System

JWT-based authentication with protected routes:

```typescript
import { bunserve, Context } from 'bunserve'
import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface User {
  id: string
  email: string
  password_hash: string
}

const users = new Map<string, User>()

// Authentication middleware
// The context parameter is destructured to { request }
const authenticate = async ({ request }, next) => {
  const auth_header = request.headers.get('authorization')

  if (!auth_header?.startsWith('Bearer ')) {
    const error: any = new Error('No token provided');
    error.status = 401;
    throw error;
  }

  const token = auth_header.slice(7)

  try {
    const payload = verify(token, JWT_SECRET) as { user_id: string; email: string }
    const user = users.get(payload.user_id)

    if (!user) {
      const error: any = new Error('Invalid token');
      error.status = 401;
      throw error;
    }

    Context.set({ user })
    await next()
  } catch (error) {
    const authError: any = new Error('Invalid or expired token');
    authError.status = 401;
    throw authError;
  }
}

const app = bunserve()

// Public routes
app.post('/auth/register', async ({ body, set }) => {
  if (!body.email || !body.password) {
    const error: any = new Error('Email and password required');
    error.status = 400;
    throw error;
  }

  // Check if user exists
  const existing = Array.from(users.values()).find(u => u.email === body.email)
  if (existing) {
    const error: any = new Error('Email already registered');
    error.status = 409;
    throw error;
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

app.post('/auth/login', async ({ body }) => {
  if (!body.email || !body.password) {
    const error: any = new Error('Email and password required');
    error.status = 400;
    throw error;
  }

  const user = Array.from(users.values()).find(u => u.email === body.email)
  if (!user) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const valid = await Bun.password.verify(body.password, user.password_hash)
  if (!valid) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
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
app.get('/auth/me', [authenticate], () => {
  const { user } = Context.get<{ user: User }>()

  return {
    id: user.id,
    email: user.email
  }
})

app.post('/auth/logout', [authenticate], () => {
  // In production, you'd invalidate the token server-side
  return { message: 'Logged out successfully' }
})

// Start the server
app.listen(3000)
```

## File Upload API

Handle file uploads with validation:

```typescript
import { bunserve } from 'bunserve'
import { mkdir, write } from 'node:fs/promises'
import { join } from 'node:path'

const UPLOAD_DIR = './uploads'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']

// Ensure upload directory exists
await mkdir(UPLOAD_DIR, { recursive: true })

const app = bunserve()

// Upload single file
app.post('/upload', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    const error: any = new Error('Request must be multipart/form-data');
    error.status = 400;
    throw error;
  }

  const file = body.get('file') as File
  if (!file) {
    const error: any = new Error('No file provided');
    error.status = 400;
    throw error;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    const error: any = new Error('File too large (max 5MB)');
    error.status = 400;
    throw error;
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    const error: any = new Error('Invalid file type');
    error.status = 400;
    throw error;
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
app.post('/upload/multiple', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  const files = body.getAll('files') as File[]
  if (files.length === 0) {
    set.status = 400;
    return { error: 'No files provided' };
  }

  const uploaded = []

  for (const file of files) {
    // Validate
    if (file.size > MAX_FILE_SIZE) {
      set.status = 400;
      return { error: `File ${file.name} too large` };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      set.status = 400;
      return { error: `Invalid type for ${file.name}` };
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
app.get('/uploads/:filename', ({ params }) => {
  const filepath = join(UPLOAD_DIR, params.filename)
  return new Response(Bun.file(filepath))
})

// Start the server
app.listen(3000)
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
  Context
} from 'bunserve'

const app = bunserve()

// 1. Error handling (first!)
app.use(error_handler({
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
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowed_headers: ['Content-Type', 'Authorization']
}))

// 3. Request logging
app.use(logger({
  format: process.env.NODE_ENV === 'development' ? 'dev' : 'combined',
  skip: (path) => path === '/health' || path === '/metrics'
}))

// 4. Request ID
app.use(async ({ set }, next) => {
  const request_id = crypto.randomUUID()
  set.headers['X-Request-ID'] = request_id
  Context.set({ request_id })
  await next()
})

// 5. Rate limiting
const rate_limits = new Map<string, { count: number; reset: number }>()

app.use(async ({ request, set }, next) => {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const limit = rate_limits.get(ip)

  if (limit && now < limit.reset) {
    if (limit.count >= 100) {
      set.status = 429
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;
      throw error;
    }
    limit.count++
  } else {
    rate_limits.set(ip, { count: 1, reset: now + 15 * 60 * 1000 })
  }

  await next()
})

// 6. Response time
app.use(async ({ set }, next) => {
  const start = performance.now()
  await next()
  const duration = performance.now() - start
  set.headers['X-Response-Time'] = `${duration.toFixed(2)}ms`
})

// Routes
app.get('/api/data', () => ({ data: 'Hello World' }))

// Start the server
app.listen(3000)
```

## Health Checks

Production-ready health check endpoint:

```typescript
import { bunserve } from 'bunserve'
import { Database } from 'bun:sqlite'

const db = new Database('app.db')
const redis = connectToRedis() // Your Redis client

const app = bunserve({ port: 3000 })

// Basic health check - simple status endpoint
app.get('/health', () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }
})

// Comprehensive health check with dependency checks
app.get('/health/full', async () => {
  const checks = {
    database: false,
    redis: false,
    memory: false
  }

  // Check database connection
  try {
    db.query('SELECT 1').get()
    checks.database = true
  } catch {
    checks.database = false
  }

  // Check Redis connection
  try {
    await redis.ping()
    checks.redis = true
  } catch {
    checks.redis = false
  }

  // Check memory usage
  const usage = process.memoryUsage()
  checks.memory = usage.heapUsed < usage.heapTotal * 0.9

  const all_healthy = Object.values(checks).every(check => check === true)

  return {
    status: all_healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }
})

// Liveness probe (Kubernetes) - always returns OK if server is running
app.get('/health/live', () => {
  return { status: 'alive' }
})

// Readiness probe (Kubernetes) - checks if app can handle requests
app.get('/health/ready', async () => {
  try {
    db.query('SELECT 1').get()
    return { status: 'ready' }
  } catch {
    return { status: 'not ready', error: 'Database unavailable' }
  }
})

app.listen()
```

## WebSocket Integration

Combine HTTP routes with WebSocket:

```typescript
import { bunserve } from 'bunserve'

const app = bunserve()
const connections = new Set<any>()

// HTTP routes
app.get('/', ({ set }) => {
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

app.get('/api/stats', () => {
  return {
    connections: connections.size,
    uptime: process.uptime()
  }
})

// Add WebSocket support to the server
const bun_server = Bun.serve({
  port: 3000,
  routes: app.build_routes(),

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
    return app.handle_request(req)
  }
})
```

## Database Integration

Using Bun's built-in SQLite:

```typescript
import { bunserve } from 'bunserve'
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

const app = bunserve()

// List users with pagination
app.get('/api/users', ({ query }) => {
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
app.get('/api/users/:id', ({ params, set }) => {
  const user = db.query('SELECT * FROM users WHERE id = ?').get(params.id)

  if (!user) {
    set.status = 404;
    return { error: 'User not found' };
  }

  return user
})

// Create user
app.post('/api/users', async ({ body, set }) => {
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
      set.status = 409;
      return { error: 'Email already exists' };
    }
    throw error
  }
})

// Start the server
app.listen(3000)
```

## Next Steps

- **[Getting Started](./02-getting-started.md)** - Basic setup
- **[Routing Guide](./03-routing.md)** - Advanced routing
- **[Middleware](./04-middleware.md)** - Middleware patterns
- **[API Reference](./08-api-reference.md)** - Complete API docs
