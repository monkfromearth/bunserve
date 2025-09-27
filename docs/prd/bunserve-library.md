# BunServe - Express-like Typesafe Routing Library for Bun

## Table of Contents
1. [Overview](#overview)
2. [Vision and Goals](#vision-and-goals)
3. [Incremental Development Plan](#incremental-development-plan)
4. [Core Architecture](#core-architecture)
5. [API Design](#api-design)
6. [Type Safety Implementation](#type-safety-implementation)
7. [Context Management](#context-management)
8. [Feature Roadmap](#feature-roadmap)
9. [Testing Strategy](#testing-strategy)
10. [Documentation Structure](#documentation-structure)

## Overview

This document outlines the Product Requirements Document (PRD) for **BunServe**, an Express-like typesafe routing library built on top of Bun's native `Bun.serve()` API. The library provides a clean router-based interface with response helpers, middleware compatibility, and request-scoped context management using `@theinternetfolks/context`.

### Key Objectives

- **Zero-Dependency Core**: Use only Bun's built-in APIs for the core library
- **Express-like API**: Familiar router-based patterns for Express developers
- **Type Safety**: Full TypeScript inference for routes and responses
- **Performance**: Maintain Bun's native performance characteristics
- **Response Helpers**: Built-in support for JSON, XML, HTML, images, CSV downloads
- **Context Management**: Request-scoped data sharing using AsyncLocalStorage
- **Middleware Compatibility**: Works with Express-style middleware patterns

### Design Philosophy

Unlike Elysia's schema-first approach, BunServe follows Express's pragmatic philosophy:
- Simple, flexible route handlers
- Optional type annotations
- Response helpers for common use cases
- Request-scoped context for sharing data across middleware and handlers

## Vision and Goals

### Core Vision
Create the most enjoyable and performant way to build HTTP servers with Bun, providing type safety and developer ergonomics without sacrificing speed.

### Success Metrics
- **Performance**: No more than 5% overhead compared to raw `Bun.serve()`
- **Type Safety**: 100% route parameter and response type inference
- **Adoption**: Clear migration path from Express/Elysia
- **Documentation**: Comprehensive docs with examples for every feature

## Incremental Development Plan

### Overview
The library is being developed through a series of detailed increments, each building upon the previous foundation. The following increments have been fully documented:

### Completed Increments

#### Increment 0.1: Router-based API ([docs/increments/0.1-router-based-api.md](../increments/0.1-router-based-api.md))
**Foundational router architecture with factory functions and type safety**

**Key Features:**
- `createRouter()` and `createServer()` factory functions
- HTTP method support (GET, POST, PUT, DELETE, etc.)
- Parameter extraction (`/users/:id`)
- Basic response helpers (`set` object)
- Type-safe route definitions

```typescript
import { createRouter, createServer } from 'bunserve'

const router = createRouter()
router.get('/users/:id', ({ params }) => ({ id: params.id }))
const server = createServer({ router })
server.listen(3000)
```

#### Increment 0.2: Response Context ([docs/increments/0.2-response-context.md](../increments/0.2-response-context.md))
**Enhanced response helpers and context management**

**Key Features:**
- Multiple response types (JSON, XML, HTML, images, CSV)
- `@theinternetfolks/context` integration for request-scoped data
- Cookie management utilities
- File serving capabilities
- Response caching helpers

```typescript
router.get('/api/users', () => ({ success: true, data: users }))
router.post('/api/login', async ({ body, set }) => {
  set.cookies = [{ name: 'auth_token', value: token }]
  return { success: true, user }
})
```

#### Increment 1.1: Express-style Middleware ([docs/increments/1.1-middleware.md](../increments/1.1-middleware.md))
**Express-compatible middleware system with global and route-specific chains**

**Key Features:**
- Express-compatible middleware API
- Global and route-specific middleware chains
- Error handling middleware
- Context integration in middleware
- Conditional middleware execution

```typescript
router.use(async ({ request }, next) => {
  const start = Date.now()
  await next()
  console.log(`${request.method} ${request.url} - ${Date.now() - start}ms`)
})

router.post('/api/users', [validateUser, rateLimit], async ({ body }) => {
  return await createUser(body)
})
```

#### Increment 1.2: Wildcard Routes & Error Handling ([docs/increments/1.2-wildcard-error-handling.md](../increments/1.2-wildcard-error-handling.md))
**Wildcard route patterns and comprehensive error handling**

**Key Features:**
- Wildcard route support (`/api/admin/*`, `/api/v*/users/*`)
- Route-specific and global error handlers
- Custom error types and formatting
- 404 and 500 error pages
- Error context integration

```typescript
router.get('/api/admin/*', [requireAuth, requireAdmin], ({ params }) => {
  const resource = params['*'] // 'users', 'settings', etc.
  return getAdminData(resource)
})

router.use(async ({}, next) => {
  try {
    return await next()
  } catch (error) {
    return { error: error.message, status: 500 }
  }
})
```

#### Increment 1.3: Development Server & CLI ([docs/increments/1.3-dev-server-cli.md](../increments/1.3-dev-server-cli.md))
**Development server with hot reload and CLI tools**

**Key Features:**
- Development server with hot reload
- Request logging and debugging
- CLI project scaffolding
- Route generation tools
- Configuration file support

```typescript
const server = createServer({
  router,
  development: {
    enabled: true,
    hotReload: true,
    logging: { level: 'debug' }
  }
})
```

#### Increment 1.4: Common Middleware & Helpers ([docs/increments/1.4-common-middleware.md](../increments/1.4-common-middleware.md))
**Built-in middleware and helper functions**

**Key Features:**
- CORS middleware with flexible configuration
- Static file serving with caching
- Enhanced body parsing utilities
- Security headers middleware
- Validation helpers for query and route parameters

```typescript
import { cors, staticFiles, securityHeaders, bodyparser } from 'bunserve/middleware'

router.use(cors({ origin: ['http://localhost:3000'] }))
router.use(staticFiles('./public'))
router.use(securityHeaders())
```

#### Increment 1.5: Production Optimization ([docs/increments/1.5-production-optimization.md](../increments/1.5-production-optimization.md))
**Production-ready features and optimizations**

**Key Features:**
- Response compression middleware (gzip, brotli)
- Health check endpoints
- Metrics and monitoring system
- Graceful shutdown capabilities
- Rate limiting and security features
- Deployment utilities

```typescript
router.use(compression())
router.get('/health', healthCheck({ checks: { database: checkDatabase } }))
router.use(metrics())

## Context Management

### Integration with @theinternetfolks/context

BunServe bakes in `@theinternetfolks/context` for request-scoped data management, allowing data to be shared across middleware and route handlers without prop drilling.

### Context Lifecycle

```typescript
// 1. Initialize context at request start
server.beforeEach((req) => {
  Context.init()
  Context.set({
    requestId: generateId(),
    startTime: Date.now(),
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  })
})

// 2. Use context in middleware
router.use(async ({ request }, next) => {
  const context = Context.get<{ requestId: string }>()
  console.log(`[${context.requestId}] ${request.method} ${request.url}`)
  await next()
})

// 3. Access context in route handlers
router.get('/api/user', () => {
  const { user } = Context.get<{ user: User }>()
  return user
})

// 4. Context works across async operations
router.get('/api/async', async () => {
  const context = Context.get()
  
  setTimeout(() => {
    // Context is preserved in async operations
    console.log(`Request ${context.requestId} completed`)
  }, 1000)
  
  return { success: true }
})
```

### Context Benefits

- **No Prop Drilling**: Share data without passing through function arguments
- **Request Isolation**: Each request has its own context scope
- **Async Preservation**: Context works across promises, timeouts, and async operations
- **Type Safety**: Full TypeScript support for context data
- **Zero Overhead**: Uses Node.js AsyncLocalStorage for optimal performance

## Core Architecture

### Component Overview

```
BunServe Architecture
├── Router (Route Registration & Matching)
├── Server (Bun.serve() wrapper)
├── Middleware Pipeline (Express-style)
├── Context Integration (@theinternetfolks/context)
├── Response Helpers (set object)
└── Development Tools
```

### Key Components

#### 1. Router
- Route registration and storage
- Path parameter extraction (`/users/:id`)
- HTTP method routing
- Wildcard route support (`/api/admin/*`)

#### 2. Response Helpers
- Content type management (`set.content = 'json'`)
- Status code helpers (`set.status = 201`)
- Header management (`set.headers = { ... }`)
- Cookie management (`set.cookies = [...]`)
- Redirect helpers (`set.redirect = '/new-url'`)
- Caching helpers (`set.cache = '1h'`)

#### 3. Middleware System
- Express-compatible middleware API
- Route-specific middleware chains
- Error handling middleware
- Context integration

#### 4. Context Layer
- `@theinternetfolks/context` integration
- Request lifecycle hooks
- AsyncLocalStorage-based isolation
- Type-safe context access

#### 5. Server Wrapper
- Bun.serve() integration
- Configuration management
- Development mode features
- Error handling

## API Design

### Core Factory Functions

```typescript
import { createRouter, createServer } from 'bunserve'

// Create router instance
const router = createRouter()

// Create server instance
const server = createServer({
  router,
  port: 3000,
  beforeEach: (req) => {
    // Initialize context for each request
    Context.init()
    Context.set({ startTime: Date.now() })
  }
})
```

### Router API

```typescript
interface Router {
  // HTTP methods
  get<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  post<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  put<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  patch<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  delete<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  options<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  head<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  all<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  
  // Middleware
  use(middleware: Middleware): void
  
  // Route with middleware array
  post<Path extends string>(
    path: Path, 
    middlewares: Middleware[], 
    handler: RouteHandler<Path>
  ): void
}
```

### Route Handler Context

```typescript
interface RouteContext<TPath extends string> {
  request: Request           // Original Request object
  params: RouteParams<TPath> // URL parameters (/users/:id)
  query: Record<string, string> // Query parameters
  body: any                 // Parsed request body
  set: ResponseSetter        // Response configuration
}

interface RouteParams<TPath extends string> {
  // Extracts parameters from path pattern
  // '/users/:id/posts/:postId' -> { id: string; postId: string }
}

type RouteHandler<TPath extends string> = (
  context: RouteContext<TPath>
) => Promise<any> | any
```

### Response Setter Interface

```typescript
interface ResponseSetter {
  // HTTP status
  status: number
  
  // Response content type
  content: 
    | 'json'                          // JSON response (default)
    | 'text'                          // Plain text
    | 'html'                          // HTML response
    | 'xml'                           // XML response
    | 'png' | 'svg' | 'gif' | 'webp'  // Image types (base64)
    | { type: 'csv'; filename: string } // CSV download
  
  // Custom headers
  headers: Record<string, string>
  
  // Redirect
  redirect?: string
  
  // Cookies
  cookies?: Cookie[]
  
  // Cache control
  cache?: string  // '1h', '30d', etc.
}

interface Cookie {
  name: string
  value: string
  options?: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    maxAge?: number
    domain?: string
    path?: string
  }
}
```

### Middleware API

```typescript
type Middleware = (
  context: RouteContext<string>, // Use string for any path
  next: () => Promise<void>
) => Promise<void> | void

// Example middleware
const logger = async ({ request }, next) => {
  const start = Date.now()
  await next()
  console.log(`${request.method} ${request.url} - ${Date.now() - start}ms`)
}

const auth = async ({ request, set }, next) => {
  const token = request.headers.get('authorization')
  if (!token) {
    set.status = 401
    return { error: 'Unauthorized' }
  }
  
  const user = await verifyToken(token)
  Context.set({ user }) // Store in context
  await next()
}
```

## Type Safety Implementation

### Route Parameter Inference

```typescript
// Extract parameters from path pattern
type RouteParams<T extends string> = 
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {}

// Usage examples
router.get('/users/:id', ({ params }) => {
  // params.id is inferred as string
  return { id: params.id }
})

router.get('/users/:userId/posts/:postId', ({ params }) => {
  // params: { userId: string; postId: string }
  return { 
    userId: params.userId, 
    postId: params.postId 
  }
})
```

### Handler Type Safety

```typescript
// Optional type annotations for better safety
interface User {
  id: string
  name: string
  email: string
}

interface CreateUser {
  name: string
  email: string
}

// TypeScript infers return types
router.get('/users/:id', ({ params }): User => {
  return getUserById(params.id)
})

router.post('/users', async ({ body }): Promise<User> => {
  return await createUser(body)
})

// Type checking for middleware
const validateUser = async ({ body, set }, next) => {
  if (!body.name || !body.email) {
    set.status = 400
    return { error: 'Name and email required' }
  }
  await next()
}
```

## Feature Roadmap

### Completed Features ✓
- [x] Router-based API with factory functions
- [x] HTTP method support (GET, POST, PUT, DELETE, etc.)
- [x] Parameter extraction (`/users/:id`)
- [x] Type-safe route definitions
- [x] Response helpers (`set.content`, `set.status`, etc.)
- [x] `@theinternetfolks/context` integration
- [x] Express-style middleware system
- [x] Route-specific middleware chains
- [x] Cookie and header management
- [x] Multiple response types (JSON, XML, HTML, images, CSV)
- [x] File serving and download capabilities
- [x] Error handling utilities
- [x] Development server with hot reload
- [x] CLI tools for project generation
- [x] Wildcard route support (`/api/admin/*`)
- [x] Request logging and debugging
- [x] Performance optimizations
- [x] Built-in middleware (CORS, static file serving, security)
- [x] Rate limiting and security features
- [x] Health check endpoints
- [x] Metrics and monitoring system
- [x] Response compression
- [x] Graceful shutdown capabilities

### Future Enhancements
- [ ] Request/response transformers
- [ ] Testing utilities and helpers
- [ ] Migration guides from Express
- [ ] Integration with Bun ecosystem
- [ ] Advanced caching strategies
- [ ] GraphQL integration
- [ ] WebSocket support enhancements
- [ ] Database integration helpers
- [ ] Authentication provider integrations

## Testing Strategy

### Unit Testing
- Route registration and matching algorithms
- Parameter extraction from URL patterns
- Response helper functions
- Context isolation and data sharing

### Integration Testing
- Full request/response cycles with Bun.serve
- Middleware execution and error handling
- Context preservation across async operations
- File upload and download scenarios

### Performance Testing
- Benchmark against raw Bun.serve (target: <5% overhead)
- Memory usage analysis (target: minimal overhead)
- Concurrent request handling
- Route matching performance

### Compatibility Testing
- Express middleware compatibility
- `@theinternetfolks/context` integration
- TypeScript type inference accuracy
- Browser and API client compatibility

## Documentation Structure

### Core Documentation
```
docs/
├── prd/
│   └── bunserve-library.md                    # This main PRD document
├── increments/
│   ├── 0.1-router-based-api.md               # Router foundation
│   ├── 0.2-response-context.md               # Response helpers & context
│   ├── 1.1-middleware.md                     # Express-style middleware
│   ├── 1.2-wildcard-error-handling.md        # Wildcard routes & errors
│   ├── 1.3-dev-server-cli.md                 # Development server & CLI
│   ├── 1.4-common-middleware.md              # Built-in middleware
│   └── 1.5-production-optimization.md       # Production features
├── getting-started/
│   ├── installation.md
│   ├── basic-routing.md
│   ├── response-helpers.md
│   └── middleware.md
├── api-reference/
│   ├── create-router.md
│   ├── create-server.md
│   ├── route-context.md
│   ├── response-setter.md
│   └── context-integration.md
├── guides/
│   ├── express-migration.md
│   ├── response-types.md
│   ├── error-handling.md
│   ├── performance.md
│   └── testing.md
└── examples/
    ├── basic-api/
    ├── auth-system/
    ├── file-uploads/
    └── express-comparison/
```

### Key Documentation Focus
- **Incremental Development**: Detailed implementation guides for each feature increment
- **Express Compatibility**: Clear migration paths for Express developers
- **Context Usage**: Best practices for `@theinternetfolks/context`
- **Response Helpers**: Comprehensive guide to all response types
- **Middleware Patterns**: Express-style middleware examples
- **Production Features**: Deployment, monitoring, and optimization guides
- **Development Tools**: CLI usage and development server configuration

## Success Criteria

### Technical Success
- [ ] Zero external dependencies
- [ ] Full TypeScript type inference
- [ ] <5% performance overhead
- [ ] 100% test coverage

### Developer Experience
- [ ] Intuitive API design
- [ ] Comprehensive documentation
- [ ] Easy migration path
- [ ] Active community engagement

### Adoption and Growth
- [ ] 1000+ GitHub stars
- [ ] 500+ weekly downloads
- [ ] 50+ community plugins
- [ ] Production-ready stability

---

## Implementation Status

**All Core Increments Complete** ✅

The detailed incremental development plan has been fully documented across 7 comprehensive increments:

- ✅ **Increment 0.1**: Router-based API - Foundation with factory functions
- ✅ **Increment 0.2**: Response Context - Enhanced helpers and context management  
- ✅ **Increment 1.1**: Express-style Middleware - Global and route-specific middleware
- ✅ **Increment 1.2**: Wildcard Routes & Error Handling - Flexible routing and error management
- ✅ **Increment 1.3**: Development Server & CLI - Hot reload and developer tools
- ✅ **Increment 1.4**: Common Middleware & Helpers - Built-in utilities out of the box
- ✅ **Increment 1.5**: Production Optimization - Enterprise-ready features

Each increment includes detailed API specifications, implementation details, testing strategies, performance considerations, and comprehensive examples. The documentation is ready for implementation to begin.

*This PRD will continue to be updated as development progresses, with additional detailed documentation published as new features are designed.*