# BunServe Examples

This directory contains practical examples demonstrating how to use BunServe for building web applications with Bun.

## Running Examples

Each example can be run directly with Bun:

```bash
# Run a specific example
bun 01-basic-server.ts

# Or use npm scripts
bun run 01-basic

# With hot reload during development
bun --hot 01-basic-server.ts
```

## Examples Index

### 01. Basic Server
**File**: `01-basic-server.ts`
**Topics**: Simple routing, Hello World, basic GET/POST routes

Learn the basics of creating a BunServe application with simple routes.

```bash
bun run 01-basic
```

### 02. REST API
**File**: `02-rest-api.ts`
**Topics**: CRUD operations, RESTful routing, in-memory storage

Build a complete REST API with all CRUD operations for managing resources.

```bash
bun run 02-rest-api
```

### 03. Authentication
**File**: `03-authentication.ts`
**Topics**: JWT authentication, protected routes, middleware auth

Implement JWT-based authentication with protected routes and user login.

```bash
bun run 03-auth
```

### 04. File Uploads
**File**: `04-file-uploads.ts`
**Topics**: File uploads, multipart/form-data, file validation

Handle single and multiple file uploads with validation and storage.

```bash
bun run 04-uploads
```

### 05. Middleware Stack
**File**: `05-middleware-stack.ts`
**Topics**: Production middleware, CORS, logging, error handling, security

Set up a production-ready middleware stack with all essential middleware.

```bash
bun run 05-middleware
```

### 06. Health Checks
**File**: `06-health-checks.ts`
**Topics**: Health endpoints, readiness checks, liveness probes

Implement health check endpoints for monitoring and orchestration.

```bash
bun run 06-health
```

### 07. WebSockets
**File**: `07-websockets.ts`
**Topics**: WebSocket integration, HTTP + WebSocket combined server

Build a server that handles both HTTP and WebSocket connections.

```bash
bun run 07-websockets
```

### 08. Database Integration
**File**: `08-database.ts`
**Topics**: Bun SQLite, database queries, pagination

Integrate with Bun's native SQLite database with proper error handling.

```bash
bun run 08-database
```

### 09. Sub-Routers
**File**: `09-sub-routers.ts`
**Topics**: Modular routing, router mounting, API versioning

Organize routes into modular sub-routers for better code structure.

```bash
bun run 09-routers
```

### 10. Static Files
**File**: `10-static-files.ts`
**Topics**: Static file serving, caching, MIME types

Serve static files with the static files middleware and caching.

```bash
bun run 10-static
```

### 11. Session Management
**File**: `11-sessions.ts`
**Topics**: Cookie-based sessions, login/logout, session storage

Implement session management for user authentication and state tracking.

```bash
bun run 11-sessions
```

## Installation

These examples use the `bunserve` package. If running from this directory:

```bash
# Install dependencies
bun install

# Or link to local development version
cd ..
bun link
cd examples
bun link bunserve
```

## Next Steps

After exploring these examples:

- Read the [Full Documentation](../docs/)
- Check out the [API Reference](../docs/docs/08-api-reference.md)
- See [Best Practices](../docs/docs/10-best-practices.md)
- Review [Deployment Guide](../docs/docs/11-deployment.md)

## Contributing

Found an issue or have an example to add? See [CONTRIBUTING.md](../CONTRIBUTING.md)
