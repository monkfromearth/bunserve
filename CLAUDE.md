---
description: BunServe coding standards - Use Bun runtime and snake_case conventions
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, *.md, package.json"
alwaysApply: true
---

# BunServe Coding Standards

## Naming Conventions

**CRITICAL**: BunServe uses snake_case for ALL variables, functions, parameters, and properties.

### ✅ Correct Usage

```typescript
// Variables and functions
const api_router = router();
const search_term = query.q;
const check_database = async () => {};
const require_auth = async (context, next) => {};

// Function parameters
function create_user(user_id: string, email_address: string) {}

// Object properties (in code, NOT in type definitions)
const user = {
  user_id: '123',
  email_address: 'user@example.com',
  created_at: new Date()
};

// Middleware and route handlers
const error_handler = () => {};
const user_router = router();
```

### ✅ Type Definitions (PascalCase for types, snake_case for properties)

```typescript
// Interface/type names use PascalCase
interface User {
  user_id: string;        // Properties use snake_case
  email_address: string;
  created_at: Date;
}

type RouteParams = {
  user_id: string;
  post_id: string;
};
```

### ❌ Incorrect Usage

```typescript
// WRONG - don't use camelCase for variables
const apiRouter = router();          // Should be: api_router
const searchTerm = query.q;          // Should be: search_term
const checkDatabase = async () => {}; // Should be: check_database
const requireAuth = async () => {};   // Should be: require_auth
```

## Bun Runtime Standards

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Documentation Standards

### README.md Guidelines

1. **Keep it concise** - Target 400-500 lines maximum
2. **Use Table of Contents** - Add navigation links for sections
3. **Link to detailed docs** - Don't duplicate full API reference in README
4. **Show brief examples** - Keep code snippets short, link to docs for details
5. **Verify all numbers** - All performance claims must be from actual benchmarks

### Example Code Standards

1. **Always use snake_case** for variables, even in examples:
   ```typescript
   // ✅ CORRECT
   const api_router = router();
   const search_term = query.q;

   // ❌ WRONG
   const apiRouter = router();
   const searchTerm = query.q;
   ```

2. **No confusing generics** in simple examples:
   ```typescript
   // ✅ CORRECT - clear and simple
   app.get('/users/:id', ({ params }) => {
     return { user_id: params.id };
   });

   // ❌ WRONG - unnecessary generic confuses readers
   app.get<Path>('/users/:id', ({ params }) => {
     return { user_id: params.id };
   });
   ```

3. **Add comments** explaining purpose and impact:
   ```typescript
   // ✅ GOOD - explains what and why
   app.use(cors({
     preset: 'production',              // Use strict production settings
     allowed_origins: ['https://example.com']  // Only allow specific domain
   }));
   ```

4. **Use standardized error handling**:
   ```typescript
   // ✅ CORRECT - plain Error with status property
   const error: any = new Error('User not found');
   error.status = 404;
   throw error;

   // ❌ AVOID - custom HttpError classes add complexity
   throw HttpError.notFound('User not found');
   ```

### Performance Claims

**ALWAYS verify numbers before documenting:**

1. Run benchmarks: `bun benchmarks/scripts/performance-regression.ts`
2. Check baseline: `cat benchmarks/data/performance-baseline.json`
3. Use actual numbers, not approximations
4. Include disclaimer for competitive comparisons

Example from latest baseline:
- Route Parameters: **61,090 req/s**, avg: 0.016ms, p95: 0.032ms
- Middleware (3x): **51,003 req/s**, avg: 0.020ms, p95: 0.041ms
- Simple GET: **42,770 req/s**, avg: 0.023ms, p95: 0.055ms

### Comparison Tables

When comparing to other frameworks:

1. **Use verified BunServe metrics** from actual benchmarks
2. **Approximate other frameworks** with disclaimer
3. **Add performance note** explaining methodology
4. **Include both throughput AND latency** for complete picture

```markdown
| Framework | Performance |
|-----------|-------------|
| BunServe  | **34,253 req/s** (verified) |
| Express   | ~10-15k req/s (approximate) |

**Note**: BunServe numbers verified on Apple Silicon. Others approximate.
```

## Code Quality Standards

1. **Type everything** - leverage TypeScript fully
2. **Prefer const** over let
3. **Use async/await** instead of promises
4. **Destructure context** in handlers: `({ params, body, set }, next) => {}`
5. **Chain middleware** with arrays: `app.get('/path', [auth, validate], handler)`

## Testing Standards

1. **Use Bun's test runner**: `bun test`
2. **Test file naming**: `*.test.ts`
3. **Organize by feature**: routing, middleware, security, performance
4. **Include comments** explaining what's being tested

```typescript
import { test, expect } from 'bun:test';

test('handles route parameters with snake_case variables', () => {
  const user_id = '123';
  expect(user_id).toBe('123');
});
```

## Git Commit Standards

When making commits:

1. Use snake_case in commit messages for consistency
2. Reference issue numbers when applicable
3. Keep first line under 72 characters
4. Include Co-Authored-By for AI assistance:

```
feat: add security_headers middleware

Implemented comprehensive security headers including CSP, HSTS,
and X-Frame-Options for production security.

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```
