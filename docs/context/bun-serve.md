# Bun.serve Comprehensive Guide

## Overview

`Bun.serve()` is Bun's high-performance HTTP server implementation. According to the documentation, it's "A fast all-in-one JavaScript runtime and toolkit" that supports WebSockets, HTTPS, and routes with a clean API design.

## Basic Usage

### Simple HTTP Server

```ts
const server = Bun.serve({
  fetch(req) {
    const path = new URL(req.url).pathname;
    
    if (path === "/") return new Response("Welcome to Bun!");
    if (path === "/api") return Response.json({ some: "buns", for: "you" });
    
    return new Response("Page not found", { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
```

### Routes API (Bun v1.2.3+)

```ts
Bun.serve({
  routes: {
    // Static routes
    "/api/status": new Response("OK"),
    
    // Dynamic routes
    "/users/:id": req => {
      return new Response(`Hello User ${req.params.id}!`);
    },
    
    // Per-HTTP method handlers
    "/api/posts": {
      GET: () => new Response("List posts"),
      POST: async req => {
        const body = await req.json();
        return Response.json({ created: true, ...body });
      },
    },
    
    // Wildcard route
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
    
    // Redirect
    "/blog/hello": Response.redirect("/blog/hello/world"),
    
    // Serve a file
    "/favicon.ico": new Response(await Bun.file("./favicon.ico").bytes(), {
      headers: { "Content-Type": "image/x-icon" },
    }),
  },
  
  // Fallback for unmatched routes
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});
```

## API Reference

### `Bun.serve(options)` Configuration

The main configuration object accepts the following properties:

#### Core Options
- **`fetch(req, server?)`**: `(Request) => Response | Promise<Response>` - Main request handler
- **`routes`**: `Record<string, Response | ((req: BunRequest) => Response) | MethodHandlers>` - Route definitions (v1.2.3+)
- **`port`**: `number` - Port to listen on (default: 3000)
- **`hostname`**: `string` - Hostname to bind to (default: "0.0.0.0")

#### WebSocket Support
- **`websocket`**: `WebSocketHandler` - WebSocket event handlers
- **`server.upgrade(req, options?)`**: Upgrade HTTP request to WebSocket

#### Development Features
- **`development`**: `{ hmr?: boolean, console?: boolean }` - Development server options

### Route Handling

#### Request Object (`BunRequest`)
```ts
interface BunRequest<T extends string> extends Request {
  params: Record<T, string>;
  readonly cookies: CookieMap;
}
```

#### Route Parameter Types
```ts
import type { BunRequest } from "bun";

Bun.serve({
  routes: {
    // TypeScript knows the shape of params
    "/orgs/:orgId/repos/:repoId": req => {
      const { orgId, repoId } = req.params;
      return Response.json({ orgId, repoId });
    },
    
    // Explicit type annotation
    "/orgs/:orgId/repos/:repoId/settings": (
      req: BunRequest<"/orgs/:orgId/repos/:repoId/settings">,
    ) => {
      const { orgId, repoId } = req.params;
      return Response.json({ orgId, repoId });
    },
  },
});
```

## WebSocket Support

### Basic WebSocket Server

```ts
Bun.serve({
  fetch(req, server) {
    // Upgrade request to WebSocket
    if (server.upgrade(req)) {
      return; // Do not return a Response
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    message(ws, message) {
      ws.send(message); // Echo back
    },
    open(ws) {
      console.log("WebSocket opened");
    },
    close(ws, code, message) {
      console.log("WebSocket closed");
    },
    drain(ws) {
      // Socket is ready to receive more data
    },
  },
});
```

### WebSocket with Context Data

```ts
type WebSocketData = {
  createdAt: number;
  channelId: string;
  authToken: string;
};

Bun.serve<WebSocketData>({
  fetch(req, server) {
    const cookies = new Bun.CookieMap(req.headers.get("cookie")!);
    
    server.upgrade(req, {
      data: {
        createdAt: Date.now(),
        channelId: new URL(req.url).searchParams.get("channelId"),
        authToken: cookies.get("X-Token"),
      },
    });
    
    return undefined;
  },
  websocket: {
    message(ws, message) {
      const user = getUserFromToken(ws.data.authToken);
      // Use ws.data for contextual information
    },
  },
});
```

### WebSocket Pub/Sub

```ts
const server = Bun.serve<{ username: string }>({
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      const username = getUsernameFromReq(req);
      const success = server.upgrade(req, { data: { username } });
      return success
        ? undefined
        : new Response("WebSocket upgrade error", { status: 400 });
    }
    return new Response("Hello world");
  },
  websocket: {
    open(ws) {
      const msg = `${ws.data.username} has entered the chat`;
      ws.subscribe("the-group-chat");
      server.publish("the-group-chat", msg);
    },
    message(ws, message) {
      server.publish("the-group-chat", `${ws.data.username}: ${message}`);
    },
    close(ws) {
      const msg = `${ws.data.username} has left the chat`;
      ws.unsubscribe("the-group-chat");
      server.publish("the-group-chat", msg);
    },
  },
});
```

## Server Properties

The returned server object has these properties:
- **`server.url`**: `string` - Full server URL
- **`server.port`**: `number` - Port the server is listening on
- **`server.hostname`**: `string` - Hostname the server is bound to
- **`server.publish(topic, message)`**: Publish message to WebSocket topic

## Full-Stack Development

### HTML Import Support

```ts
import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  }
});
```

### HTML File Structure

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

### React/TSX Support

```tsx
import React from "react";
import './index.css';
import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

## Development Features

### Hot Module Replacement (HMR)

HMR is enabled by default and can be controlled via the `development` option:

```ts
Bun.serve({
  // ... other options
  development: {
    hmr: true, // Enable/disable HMR
    console: true, // Stream browser console to terminal
    chromeDevToolsAutomaticWorkspaceFolders: true,
  },
});
```

### HMR API

```ts
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    console.log("Cleaning up...");
  });
}
```

## Performance Features

According to benchmarks, Bun's WebSocket implementation is approximately **7x faster** than Node.js + ws:

| Messages sent per second | Runtime | Clients |
|--------------------------|---------|---------|
| ~700,000 | (Bun.serve) Bun v0.2.1 (x64) | 16 |
| ~100,000 | (ws) Node v18.10.0 (x64) | 16 |

## Common Patterns

### Form Handling

```ts
Bun.serve({
  fetch(req) {
    if (req.method === "POST" && req.url === "/form") {
      const data = await req.formData();
      console.log(data.get("someField"));
      return new Response("Success");
    }
  },
});
```

### JSON API Endpoints

```ts
Bun.serve({
  fetch(req) {
    if (req.method === "POST" && req.url === "/api/post") {
      const data = await req.json();
      console.log("Received JSON:", data);
      return Response.json({ success: true, data });
    }
  },
});
```

### Static File Serving

```ts
Bun.serve({
  fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/source") {
      return new Response(Bun.file(import.meta.path));
    }
  },
});
```

## Running the Server

```bash
# Basic server
bun index.ts

# With hot reloading
bun --hot index.ts

# HTML file with auto-bundling
bun index.html
```

## Best Practices

1. **Use the `routes` API** for clean route definitions (Bun v1.2.3+)
2. **Leverage static responses** for health checks and redirects
3. **Use TypeScript** for type-safe route parameters
4. **Enable HMR** in development for faster iteration
5. **Use Bun's built-in APIs** like `Bun.file()` for file operations
6. **Utilize WebSocket pub/sub** for real-time applications

## Limitations

- The `routes` API requires Bun v1.2.3+
- Some HMR features are still in development
- WebSocket handlers use a different API pattern than client-side WebSockets (method-based vs event-based)