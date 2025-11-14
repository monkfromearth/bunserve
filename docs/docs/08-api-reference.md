# API Reference

Complete API reference for BunServe.

## Core Functions

### `bunserve(config?)`

Creates a new BunServe application instance with routing and server capabilities.

**Parameters**:
- `config?: ServerConfig` - Optional server configuration object

**Returns**: `App` - Application instance with routing methods and server control

**Example**:
```typescript
// Create a new application instance
import { bunserve } from 'bunserve';

// Simple usage
const app = bunserve();
app.get('/', () => 'Hello World');
app.listen(3000);

// With configuration
const app = bunserve({
  port: 3000,               // Port to listen on
  host: 'localhost',        // Host address
  before_each: async (request) => {
    // Hook called before each request
    console.log(`Request: ${request.url}`);
  }
});
```

### `router()`

Creates a sub-router for modular route organization. Use this to create separate routers that can be mounted on the main application.

**Returns**: `Router`

**Example**:
```typescript
// Create a sub-router for API endpoints
import { bunserve, router } from 'bunserve';

// Create main app
const app = bunserve();

// Create a sub-router for user routes
const user_router = router();
user_router.get('/users', () => ({ users: [] }));
user_router.get('/users/:id', ({ params }) => ({ id: params.id }));

// Mount the sub-router under /api path
app.use('/api', user_router);

app.listen(3000);
```

## Router Interface

### HTTP Method Functions

Register routes for specific HTTP methods.

#### `app.get(path, handler)`
#### `app.get(path, middlewares, handler)`

Register a GET route.

**Parameters**:
- `path: string` - Route path pattern (e.g., `/users/:id`)
- `middlewares?: Middleware[]` - Optional array of middleware functions
- `handler: RouteHandler<Path>` - Route handler function

**Example**:
```typescript
// Register a GET route with automatic parameter extraction
// The context parameter is destructured to { params }
app.get('/users/:id', ({ params }) => {
  return { user_id: params.id };
});

// Register a GET route with middleware array
app.get('/admin', [requireAuth, requireAdmin], () => {
  return { admin: true };
});
```

#### `app.post(path, handler)`
#### `app.post(path, middlewares, handler)`

Register a POST route.

**Example**:
```typescript
// Register a POST route to create a user
app.post('/users', async ({ body }) => {
  return await createUser(body);
});
```

#### `app.put(path, handler)`
#### `app.put(path, middlewares, handler)`

Register a PUT route.

#### `app.patch(path, handler)`
#### `app.patch(path, middlewares, handler)`

Register a PATCH route.

#### `app.delete(path, handler)`
#### `app.delete(path, middlewares, handler)`

Register a DELETE route.

#### `app.options(path, handler)`
#### `app.options(path, middlewares, handler)`

Register an OPTIONS route.

#### `app.head(path, handler)`
#### `app.head(path, middlewares, handler)`

Register a HEAD route.

#### `app.all(path, handler)`
#### `app.all(path, middlewares, handler)`

Register a route that matches all HTTP methods.

### `app.use(middleware)`

Add global middleware that runs for all routes.

**Parameters**:
- `middleware: Middleware` - Middleware function

**Example**:
```typescript
// Add global middleware that runs for all routes
// The context parameter is destructured to { request }
app.use(async ({ request }, next) => {
  console.log(`${request.method} ${request.url}`);
  await next(); // Continue to next middleware or handler
});
```

### `app.build_routes()`

Build and return Bun-compatible routes object. (Internal use)

**Returns**: `BunRoutes`

## Type Definitions

### `RouteHandler<TPath>`

Route handler function type.

```typescript
type RouteHandler<TPath extends string> = (
  context: RouteContext<TPath>
) => Promise<any> | any
```

**Parameters**:
- `context: RouteContext<TPath>` - Route context object

**Returns**: `Promise<any> | any` - Response data

### `RouteContext<TPath>`

Route context interface provided to handlers and middleware.

```typescript
interface RouteContext<TPath extends string> {
  request: BunRequest<TPath>
  params: RouteParams<TPath>
  query: Record<string, string>
  body: any
  cookies: CookieMap
  set: ResponseSetter
}
```

**Properties**:
- `request` - The BunRequest object with native params and cookies
- `params` - Extracted route parameters (type-safe)
- `query` - Query string parameters
- `body` - Parsed request body
- `cookies` - Bun's native CookieMap for cookie management
- `set` - Response configuration object

### `BunRequest<TPath>`

Extended Request interface with Bun-specific features.

```typescript
interface BunRequest<TPath extends string> extends Request {
  params: RouteParams<TPath>
  readonly cookies: CookieMap
}
```

### `RouteParams<TPath>`

Automatically extracted route parameters (type-safe).

```typescript
type RouteParams<'/users/:user_id/posts/:post_id'> = {
  user_id: string
  post_id: string
}

type RouteParams<'/api/*'> = {
  '*': string
}
```

### `ResponseSetter`

Response configuration interface.

```typescript
interface ResponseSetter {
  status: number
  content: 'auto' | 'json' | 'text' | 'html' | 'xml' |
           'png' | 'svg' | 'gif' | 'webp' |
           { type: 'csv'; filename: string }
  headers: Record<string, string>
  redirect?: string
  cache?: string
}
```

**Properties**:
- `status` - HTTP status code (default: 200)
- `content` - Response content type
- `headers` - Custom HTTP headers
- `redirect` - URL for redirect response
- `cache` - Cache duration (e.g., '1h', '30d')

### `Middleware`

Middleware function type.

```typescript
type Middleware = (
  context: RouteContext<string>,
  next: () => Promise<void>
) => Promise<void | any> | void | any
```

**Parameters**:
- `context` - Route context object
- `next` - Function to call next middleware/handler

**Returns**: `Promise<void | any> | void | any`

### `CookieMap`

Bun's native cookie management interface.

```typescript
interface CookieMap extends Map<string, string> {
  set(name: string, value: string, options?: CookieOptions): this
  delete(name: string, options?: Pick<CookieOptions, 'domain' | 'path'>): boolean
}
```

### `CookieOptions`

Cookie configuration options.

```typescript
interface CookieOptions {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'strict' | 'lax' | 'none' | 'Strict' | 'Lax' | 'None'
  secure?: boolean
}
```

### `ServerConfig`

Server configuration interface for the bunserve() function.

```typescript
interface ServerConfig {
  port?: number
  host?: string
  before_each?: (request: Request) => Promise<void> | void
}
```

**Properties**:
- `port` - Port number (default: 3000)
- `host` - Host address (default: 'localhost')
- `before_each` - Hook called before each request

## App Interface

### `app.listen(port?)`

Start the server listening on the specified port.

**Parameters**:
- `port?: number` - Port to listen on (uses config default if not provided)

**Example**:
```typescript
// Start the app listening on port 3000
app.listen(3000);

// Or use the configured port
const app = bunserve({ port: 3000 });
app.listen();
```

### `app.fetch(request)`

Handle a single HTTP request. Useful for testing.

**Parameters**:
- `request: Request` - HTTP request object

**Returns**: `Promise<Response>`

**Example**:
```typescript
// Handle a single HTTP request (useful for testing)
const app = bunserve();
app.get('/users', () => ({ users: [] }));

const response = await app.fetch(
  new Request('http://localhost/api/users')
);
```

### `app.close()`

Stop the server and release resources.

**Returns**: `Promise<void>`

**Example**:
```typescript
// Stop the app and release resources
await app.close();
```

### `app.get_bun_server()`

Get the underlying Bun server instance.

**Returns**: `any` (Bun's server instance)

**Example**:
```typescript
// Get the underlying Bun server instance
const bun_server = app.get_bun_server();
console.log(`Active requests: ${bun_server.pendingRequests}`);
```

## Middleware Functions

### `error_handler(options?)`

Error handling middleware that catches and formats errors.

**Parameters**:
- `options?: ErrorHandlerOptions`

**Returns**: `Middleware`

**Example**:
```typescript
// Configure error handler middleware
import { error_handler } from 'bunserve';

app.use(error_handler({
  include_stack: true,  // Include stack traces in error responses
  format_error: (error, context) => ({
    error: error.message
  }),
  log_error: (error, context) => {
    console.error(error);
  }
}));
```

**ErrorHandlerOptions**:
```typescript
interface ErrorHandlerOptions {
  include_stack?: boolean
  format_error?: (error: Error, context: RouteContext<string>) => any
  log_error?: (error: Error, context: RouteContext<string>) => void
}
```

### `cors(options?)`

CORS middleware for handling Cross-Origin Resource Sharing.

**Parameters**:
- `options?: CorsOptions`

**Returns**: `Middleware`

**Example**:
```typescript
// Configure CORS middleware
import { cors } from 'bunserve';

app.use(cors({
  origin: ['https://example.com'],                      // Allowed origins
  credentials: true,                                     // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],            // Allowed HTTP methods
  allowed_headers: ['Content-Type', 'Authorization'],   // Allowed headers
  max_age: 86400                                        // Preflight cache duration
}));
```

**CorsOptions**:
```typescript
interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean)
  methods?: string[]
  allowed_headers?: string[]
  exposed_headers?: string[]
  credentials?: boolean
  max_age?: number
}
```

### `logger(options?)`

Request logging middleware.

**Parameters**:
- `options?: LoggerOptions`

**Returns**: `Middleware`

**Example**:
```typescript
// Configure logger middleware
import { logger } from 'bunserve';

app.use(logger({
  format: 'dev',                          // Use dev format with colors
  skip: (path) => path === '/health'      // Skip logging for health checks
}));
```

**LoggerOptions**:
```typescript
interface LoggerOptions {
  enabled?: boolean
  format?: 'combined' | 'common' | 'dev' | 'short' | 'tiny'
  log?: (message: string) => void
  skip?: (path: string) => boolean
}
```

### `static_files(options)`

Static file serving middleware with automatic MIME type detection and caching.

**Parameters**:
- `options: StaticOptions` - Static file configuration (required)

**Returns**: `Middleware`

**Example**:
```typescript
// Serve static files from ./public directory
import { static_files } from 'bunserve';

app.use(static_files({
  root: './public',           // Root directory (required)
  prefix: '/static',          // URL prefix to strip (optional)
  cache: '7d',                // Cache duration (optional)
  index: 'index.html'         // Index file name (optional)
}));
```

**StaticOptions**:
```typescript
interface StaticOptions {
  root: string           // Root directory to serve files from (required)
  prefix?: string        // URL prefix to strip before file lookup
  cache?: string         // Cache-Control duration (e.g., '1h', '7d', '30d')
  index?: string         // Index file for directory requests (default: 'index.html')
}
```

**Features**:
- Automatic MIME type detection for common file types
- Path traversal protection (blocks `..` in paths)
- Only serves GET and HEAD requests
- Cache-Control headers with configurable duration
- Directory index file support

### `sessions(options)`

Session management middleware for cookie-based user sessions.

**Parameters**:
- `options: SessionOptions` - Session configuration (required)

**Returns**: `Middleware`

**Example**:
```typescript
// Basic session management
import { sessions, MemorySessionStore } from 'bunserve';

app.use(sessions({
  secret: process.env.SESSION_SECRET,      // Secret for signing (required)
  max_age: 24 * 60 * 60 * 1000,           // 24 hours in milliseconds
  store: new MemorySessionStore(),        // Session store (optional)
  cookie_name: 'session_id',              // Cookie name (optional)
  cookie_options: {                        // Cookie options (optional)
    http_only: true,
    secure: true,
    same_site: 'strict'
  }
}));

// Access session in routes
app.get('/profile', ({ request }) => {
  const session = (request as any).session;
  return { user_id: session.data.user_id };
});
```

**SessionOptions**:
```typescript
interface SessionOptions {
  secret?: string                    // Secret key for signing sessions
  cookie_name?: string               // Session cookie name (default: 'session_id')
  max_age?: number                   // Session max age in milliseconds
  store?: SessionStore               // Session storage backend
  cookie_options?: {                 // Cookie configuration
    path?: string
    domain?: string
    http_only?: boolean
    secure?: boolean
    same_site?: 'strict' | 'lax' | 'none'
  }
  cleanup_interval?: number          // Auto-cleanup interval in ms
}
```

**Session Interface**:
```typescript
interface Session {
  id: string                         // Unique session ID
  data: Record<string, any>          // Session data storage
  created_at: number                 // Creation timestamp
  last_access: number                // Last access timestamp
}
```

**SessionStore Interface**:
```typescript
interface SessionStore {
  get(session_id: string): Promise<Session | null>
  set(session_id: string, session: Session): Promise<void>
  delete(session_id: string): Promise<void>
  cleanup?(): Promise<void>
}
```

**Helper Functions**:
- `generate_csrf_token(session: Session): string` - Generate CSRF token
- `validate_csrf_token(session: Session, token: string): boolean` - Validate CSRF token
- `destroy_session(session: Session, cookies: CookieMap, store: SessionStore): Promise<void>` - Destroy session

### `security(options?)`

Security headers middleware for protecting against common web vulnerabilities.

**Parameters**:
- `options?: SecurityHeadersOptions` - Security configuration (optional)

**Returns**: `Middleware`

**Example**:
```typescript
// Use default security headers
import { security } from 'bunserve';

app.use(security());

// Custom security configuration
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"]
    }
  },
  strict_transport_security: {
    max_age: 31536000,
    include_sub_domains: true
  }
}));
```

**SecurityHeadersOptions**:
```typescript
interface SecurityHeadersOptions {
  content_security_policy?: {
    directives?: Record<string, string[]>
  } | false
  frame_options?: 'DENY' | 'SAMEORIGIN' | false
  content_type_options?: 'nosniff' | false
  xss_protection?: string | false
  strict_transport_security?: {
    max_age?: number
    include_sub_domains?: boolean
    preload?: boolean
  } | false
  referrer_policy?: string | false
  permissions_policy?: Record<string, string[]> | false
  cross_domain_policy?: string | false
  remove_powered_by?: boolean
}
```

## Error Handling

BunServe's error handler catches any Error with a `.status` property. You can throw errors in several ways:

### Plain Error with Status Property

```typescript
// Simple approach - add status property to any Error
app.get('/user/:id', ({ params }) => {
  const error: any = new Error('User not found');
  error.status = 404;
  throw error;
});

// With details
app.post('/users', async ({ body }) => {
  const error: any = new Error('Invalid input');
  error.status = 400;
  error.details = {
    fields: ['email', 'password']
  };
  throw error;
});
```

### Custom Error Classes

```typescript
// Create reusable error classes
class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Use in routes
throw new AppError('User not found', 404);
throw new AppError('Invalid input', 400);
```

### Error Factory Functions

```typescript
// Create factory functions for common errors
const NotFoundError = (message: string) => {
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

// Use in routes
throw NotFoundError('User not found');
throw BadRequestError('Invalid input', { fields: ['email'] });
```


## Context Management

### `Context.init()`

Initialize context for the current request.

**Example**:
```typescript
// Initialize context for the current request
import { Context } from 'bunserve';

Context.init();
```

### `Context.set(data)`

Set context data for the current request.

**Parameters**:
- `data: Record<string, any>` - Data to store in context

**Example**:
```typescript
// Set context data for the current request
Context.set({
  user_id: '123',
  request_id: 'abc-def'
});
```

### `Context.get<T>()`

Get context data for the current request.

**Returns**: `T | undefined`

**Example**:
```typescript
// Get typed context data for the current request
const ctx = Context.get<{ user_id: string }>();
console.log(ctx?.user_id);
```

## Presets

### CORS Presets

```typescript
import { cors } from 'bunserve'

// Development preset (allows localhost)
app.use(cors({ preset: 'development' }))

// Production preset (requires explicit origins)
app.use(cors({
  preset: 'production',
  allowed_origins: ['https://example.com']
}))

// Allow all preset
app.use(cors({ preset: 'allow_all' }))
```

### Logger Presets

```typescript
import { logger } from 'bunserve'

// Development preset (with colors)
app.use(logger({ preset: 'development' }))

// Production preset (with timestamps)
app.use(logger({ preset: 'production' }))

// Minimal preset
app.use(logger({ preset: 'minimal' }))
```

## Environment Variables

BunServe respects the following environment variables:

- `NODE_ENV` - Environment mode (`development` or `production`)
  - Affects error stack traces and logging
- `PORT` - Default server port
- `BUN_PORT` - Bun-specific port (takes precedence over PORT)

## Performance

BunServe is designed for minimal overhead:

- Uses Bun's native routing system
- <5% overhead compared to raw `Bun.serve()`
- Zero custom route matching
- Efficient cookie handling with native CookieMap
- Request-scoped context using AsyncLocalStorage

## TypeScript Support

BunServe is fully typed with TypeScript:

- Automatic route parameter type inference
- Type-safe context access
- Middleware type checking
- Response type validation

```typescript
// TypeScript infers the parameter types automatically from the route path
app.get('/users/:user_id/posts/:post_id', ({ params }) => {
  // params is typed as { user_id: string; post_id: string }
  const user_id: string = params.user_id;
  const post_id: string = params.post_id;

  return { user_id, post_id };
});
```

## Next Steps

- **[Getting Started](./02-getting-started.md)** - Basic setup guide
- **[Routing Guide](./03-routing.md)** - Learn about routing patterns
- **[Middleware](./04-middleware.md)** - Middleware patterns
- **[Examples](./07-examples.md)** - Complete working examples
