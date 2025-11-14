# API Reference

Complete API reference for BunServe.

## Core Functions

### `create_router()`

Creates a new router instance for registering routes.

**Returns**: `Router`

**Example**:
```typescript
// Create a new router instance
import { create_router } from 'bunserve';

const router = create_router();
```

### `create_server(config)`

Creates a new HTTP server with the provided configuration.

**Parameters**:
- `config: ServerConfig` - Server configuration object

**Returns**: `Server`

**Example**:
```typescript
// Create a server with configuration options
import { create_server } from 'bunserve';

const server = create_server({
  router,                    // Router instance with routes
  port: 3000,               // Port to listen on
  host: 'localhost',        // Host address
  before_each: async (request) => {
    // Hook called before each request
    console.log(`Request: ${request.url}`);
  }
});
```

## Router Interface

### HTTP Method Functions

Register routes for specific HTTP methods.

#### `router.get(path, handler)`
#### `router.get(path, middlewares, handler)`

Register a GET route.

**Parameters**:
- `path: string` - Route path pattern (e.g., `/users/:id`)
- `middlewares?: Middleware[]` - Optional array of middleware functions
- `handler: RouteHandler<Path>` - Route handler function

**Example**:
```typescript
// Register a GET route with automatic parameter extraction
router.get('/users/:id', ({ params }) => {
  return { user_id: params.id };
});

// Register a GET route with middleware array
router.get('/admin', [requireAuth, requireAdmin], () => {
  return { admin: true };
});
```

#### `router.post(path, handler)`
#### `router.post(path, middlewares, handler)`

Register a POST route.

**Example**:
```typescript
// Register a POST route to create a user
router.post('/users', async ({ body }) => {
  return await createUser(body);
});
```

#### `router.put(path, handler)`
#### `router.put(path, middlewares, handler)`

Register a PUT route.

#### `router.patch(path, handler)`
#### `router.patch(path, middlewares, handler)`

Register a PATCH route.

#### `router.delete(path, handler)`
#### `router.delete(path, middlewares, handler)`

Register a DELETE route.

#### `router.options(path, handler)`
#### `router.options(path, middlewares, handler)`

Register an OPTIONS route.

#### `router.head(path, handler)`
#### `router.head(path, middlewares, handler)`

Register a HEAD route.

#### `router.all(path, handler)`
#### `router.all(path, middlewares, handler)`

Register a route that matches all HTTP methods.

### `router.use(middleware)`

Add global middleware that runs for all routes.

**Parameters**:
- `middleware: Middleware` - Middleware function

**Example**:
```typescript
// Add global middleware that runs for all routes
router.use(async ({ request }, next) => {
  console.log(`${request.method} ${request.url}`);
  await next(); // Continue to next middleware or handler
});
```

### `router.build_routes()`

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
type RouteParams<'/users/:userId/posts/:postId'> = {
  userId: string
  postId: string
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

Server configuration interface.

```typescript
interface ServerConfig {
  router: Router
  port?: number
  host?: string
  before_each?: (request: Request) => Promise<void> | void
}
```

**Properties**:
- `router` - Router instance
- `port` - Port number (default: 3000)
- `host` - Host address (default: 'localhost')
- `before_each` - Hook called before each request

## Server Interface

### `server.listen(port?)`

Start the server listening on the specified port.

**Parameters**:
- `port?: number` - Port to listen on (uses config default if not provided)

**Example**:
```typescript
// Start the server listening on port 3000
server.listen(3000);
```

### `server.fetch(request)`

Handle a single HTTP request. Useful for testing.

**Parameters**:
- `request: Request` - HTTP request object

**Returns**: `Promise<Response>`

**Example**:
```typescript
// Handle a single HTTP request (useful for testing)
const response = await server.fetch(
  new Request('http://localhost/api/users')
);
```

### `server.close()`

Stop the server and release resources.

**Returns**: `Promise<void>`

**Example**:
```typescript
// Stop the server and release resources
await server.close();
```

### `server.get_bun_server()`

Get the underlying Bun server instance.

**Returns**: `any` (Bun's server instance)

**Example**:
```typescript
// Get the underlying Bun server instance
const bun_server = server.get_bun_server();
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

router.use(error_handler({
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

router.use(cors({
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

router.use(logger({
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

## Error Classes

### `HttpError`

HTTP error class for structured error responses.

#### Constructor

```typescript
new HttpError(status: number, message: string, details?: any)
```

#### Factory Methods

**`HttpError.bad_request(message, details?)`**

Create a 400 Bad Request error.

**`HttpError.unauthorized(message?)`**

Create a 401 Unauthorized error.

**`HttpError.forbidden(message?)`**

Create a 403 Forbidden error.

**`HttpError.not_found(message?)`**

Create a 404 Not Found error.

**`HttpError.conflict(message, details?)`**

Create a 409 Conflict error.

**`HttpError.internal(message?)`**

Create a 500 Internal Server Error.

**Example**:
```typescript
import { HttpError } from 'bunserve';

// Throw specific HTTP errors
throw HttpError.not_found('User not found');

// Throw error with additional details
throw HttpError.bad_request('Invalid input', {
  fields: ['email', 'password']
});

// Create custom HTTP status error
throw new HttpError(418, "I'm a teapot");
```

## Health Check Functions

### `create_health_check(options?)`

Create a health check handler.

**Parameters**:
- `options?: HealthCheckOptions`

**Returns**: `RouteHandler`

**Example**:
```typescript
// Create a health check endpoint with dependency checks
import { create_health_check } from 'bunserve';

router.get('/health', create_health_check({
  checks: {
    database: async () => {
      // Check if database is accessible
      return await checkDatabase();
    },
    redis: async () => {
      // Check if Redis is accessible
      return await checkRedis();
    }
  },
  include_system_info: true  // Include system metrics in response
}));
```

**HealthCheckOptions**:
```typescript
interface HealthCheckOptions {
  checks?: Record<string, HealthCheck>
  include_system_info?: boolean
}

type HealthCheck = () => Promise<boolean> | boolean
```

**Response Format**:
```typescript
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks?: Record<string, boolean>
}
```

### `simple_health_check()`

Simple health check that always returns healthy.

**Returns**: `RouteHandler`

**Example**:
```typescript
import { simple_health_check } from 'bunserve'

router.get('/health', simple_health_check())
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
import { cors_presets } from 'bunserve'

// Allow all origins
router.use(cors_presets.allow_all())

// Development (allows localhost)
router.use(cors_presets.development())

// Production (requires explicit origins)
router.use(cors_presets.production([
  'https://example.com'
]))
```

### Logger Presets

```typescript
import { logger_presets } from 'bunserve'

// Development (with colors)
router.use(logger_presets.development())

// Production (with timestamps)
router.use(logger_presets.production())

// Minimal
router.use(logger_presets.minimal())
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
router.get('/users/:userId/posts/:postId', ({ params }) => {
  // params is typed as { userId: string; postId: string }
  const userId: string = params.userId;
  const postId: string = params.postId;

  return { userId, postId };
});
```

## Next Steps

- **[Getting Started](./02-getting-started.md)** - Basic setup guide
- **[Routing Guide](./03-routing.md)** - Learn about routing patterns
- **[Middleware](./04-middleware.md)** - Middleware patterns
- **[Examples](./07-examples.md)** - Complete working examples
