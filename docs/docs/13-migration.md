# Migration Guide

Guide to migrating from other web frameworks to BunServe.

## Table of Contents

- [Express to BunServe](#express-to-bunserve)
- [Elysia to BunServe](#elysia-to-bunserve)
- [Hono to BunServe](#hono-to-bunserve)
- [Common Patterns](#common-patterns)

## Express to BunServe

BunServe uses an Express-like API, making migration straightforward.

### Installation

```bash
# Remove Express
bun remove express

# Install BunServe
bun add bunserve
```

### Basic Server

**Express:**
```typescript
import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**BunServe:**
```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

// Body parsing is automatic in BunServe

app.get('/', () => {
  return { message: 'Hello World' };
});

app.listen(3000);
```

### Route Parameters

**Express:**
```typescript
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});
```

**BunServe:**
```typescript
app.get('/users/:id', ({ params }) => {
  return { id: params.id };
});
```

### Middleware

**Express:**
```typescript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

**BunServe:**
```typescript
app.use(async ({ request }, next) => {
  console.log(`${request.method} ${request.url}`);
  await next();
});
```

### Error Handling

**Express:**
```typescript
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  });
});
```

**BunServe:**
```typescript
import { error_handler } from 'bunserve';

app.use(error_handler());
```

### CORS

**Express:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: 'https://example.com',
  credentials: true
}));
```

**BunServe:**
```typescript
import { cors } from 'bunserve';

app.use(cors({
  origin: ['https://example.com'],
  credentials: true
}));
```

### Cookies

**Express:**
```typescript
import cookieParser from 'cookie-parser';

app.use(cookieParser());

app.post('/login', (req, res) => {
  res.cookie('session', 'value', {
    httpOnly: true,
    secure: true
  });
  res.json({ success: true });
});
```

**BunServe:**
```typescript
// No cookie parser needed - built-in

app.post('/login', ({ cookies }) => {
  cookies.set('session', 'value', {
    httpOnly: true,
    secure: true
  });
  return { success: true };
});
```

## Elysia to BunServe

### Installation

```bash
# Remove Elysia
bun remove elysia

# Install BunServe
bun add bunserve
```

### Basic Server

**Elysia:**
```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/', () => 'Hello World')
  .listen(3000);
```

**BunServe:**
```typescript
import { bunserve } from 'bunserve';

const app = bunserve();
app.get('/', () => 'Hello World');
app.listen(3000);
```

### Routes with Parameters

**Elysia:**
```typescript
app.get('/users/:id', ({ params: { id } }) => ({
  id
}));
```

**BunServe:**
```typescript
app.get('/users/:id', ({ params }) => ({
  id: params.id
}));
```

### Middleware

**Elysia:**
```typescript
app.use((context) => {
  console.log(context.request.method);
});
```

**BunServe:**
```typescript
app.use(async ({ request }, next) => {
  console.log(request.method);
  await next();
});
```

## Hono to BunServe

### Basic Server

**Hono:**
```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({ message: 'Hello' }));

export default app;
```

**BunServe:**
```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

app.get('/', () => ({ message: 'Hello' }));

app.listen(3000);
```

## Common Patterns

### File Uploads

**Express (with multer):**
```typescript
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: req.file });
});
```

**BunServe:**
```typescript
app.post('/upload', async ({ body }) => {
  const file = body.get('file') as File;
  await Bun.write(`./uploads/${file.name}`, file);
  return { success: true };
});
```

### Static Files

**Express:**
```typescript
import express from 'express';

app.use('/static', express.static('public'));
```

**BunServe:**
```typescript
app.get('/static/:filename', ({ params }) => {
  return new Response(Bun.file(`./public/${params.filename}`));
});
```

## Next Steps

- **[Best Practices](./10-best-practices.md)** - BunServe best practices
- **[Deployment](./11-deployment.md)** - Deploy to production
- **[API Reference](./08-api-reference.md)** - Complete API documentation
