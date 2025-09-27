# @levo.libraries/server

A powerful server library for building HTTP APIs with enhanced routing capabilities, built on Express.js. This library provides a clean interface for declaring routes with strong TypeScript support, built-in response handling, and convenient features for common web development tasks.

## Features

- **Enhanced Router**: Type-safe route declarations with automatic response handling
- **Multiple Response Types**: Support for JSON, XML, HTML, text, images (PNG, SVG, WebP, GIF), and CSV downloads
- **Cookie Management**: Easy cookie setting with various options
- **File Downloads**: Built-in support for CSV file downloads with custom filenames
- **Image Serving**: Automatic image type detection and proper headers for PNG, SVG, WebP, and GIF
- **Caching Support**: Built-in cache control headers with configurable TTL
- **Middleware Support**: Full Express middleware compatibility
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Quick Start

```typescript
import { createRouter, configureServer } from '@levo.libraries/server';
import express from 'express';

const app = express();

// Configure the server with CORS and rate limiting
configureServer({
  app,
  cors: {
    allowed_domain: 'example.com'
  },
  with_rate_limiter: true
});

// Create a router
const router = createRouter();

// Define routes
router.get('/api/users', async ({ set, query }) => {
  // Set response type (default: 'json')
  set.content = 'json';
  
  // Return user data
  return [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ];
});

// Use the router
app.use(router);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Route Declaration

### Basic Routes

```typescript
const router = createRouter();

// GET route
router.get('/api/posts', async ({ set, query }) => {
  const { page = '1', limit = '10' } = query;
  const posts = await getPosts(parseInt(page), parseInt(limit));
  return posts;
});

// POST route
router.post('/api/posts', async ({ body, set }) => {
  const post = await createPost(body);
  set.status = 201; // Created
  return post;
});

// PUT route
router.put('/api/posts/:id', async ({ params, body }) => {
  const post = await updatePost(params.id, body);
  return post;
});

// DELETE route
router.delete('/api/posts/:id', async ({ params, set }) => {
  await deletePost(params.id);
  set.status = 204; // No Content
  return null;
});
```

### Route with Middlewares

```typescript
import { authenticate, validate } from './middlewares';

router.post(
  '/api/users',
  [authenticate, validate(userSchema)], // Middlewares array
  async ({ body, set }) => {
    const user = await createUser(body);
    set.status = 201;
    return user;
  }
);
```

### Typed Routes

```typescript
interface CreateUserInput {
  name: string;
  email: string;
  age?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

router.post<CreateUserInput, User>(
  '/api/users',
  async ({ body }) => {
    return await createUser(body);
  }
);
```

## Response Types

### JSON Response (Default)

```typescript
router.get('/api/data', async () => {
  return {
    success: true,
    data: [1, 2, 3]
  };
});
```

### Text Response

```typescript
router.get('/api/text', async ({ set }) => {
  set.content = 'text';
  return 'Hello, World!';
});
```

### HTML Response

```typescript
router.get('/api/html', async ({ set }) => {
  set.content = 'html';
  return '<h1>Hello, World!</h1>';
});
```

### XML Response

```typescript
router.get('/api/xml', async ({ set }) => {
  set.content = 'xml';
  return `<?xml version="1.0" encoding="UTF-8"?>
<message>Hello, World!</message>`;
});
```

### Image Responses

```typescript
router.get('/api/logo', async ({ set }) => {
  set.content = 'png';
  set.cache = '1h'; // Cache for 1 hour
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';
});

router.get('/api/icon', async ({ set }) => {
  set.content = 'svg';
  set.cache = '30d'; // Cache for 30 days
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
});
```

### CSV File Download

```typescript
router.get('/api/export', async ({ set }) => {
  set.content = { type: 'csv', filename: 'users' };
  const csvData = 'Name,Email, Age\nJohn,john@example.com,25\nJane,jane@example.com,30';
  return csvData;
});
```

## Cookie Management

```typescript
import type { Cookie } from '@levo.libraries/types';

router.post('/api/login', async ({ set, body }) => {
  const { email, password } = body;
  const user = await authenticateUser(email, password);
  
  // Set authentication cookie
  set.cookies = [{
    name: 'auth_token',
    value: user.token,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }];
  
  return { success: true, user };
});

// Multiple cookies
router.post('/api/preferences', async ({ set, body }) => {
  // Set multiple cookies
  set.cookies = [
    {
      name: 'theme',
      value: body.theme,
      options: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      }
    },
    {
      name: 'language',
      value: body.language,
      options: {
        maxAge: 30 * 24 * 60 * 60 * 1000
      }
    }
  ];
  
  return { success: true };
});
```

## Headers and Status Codes

```typescript
router.get('/api/custom', async ({ set }) => {
  // Set custom headers
  set.headers = {
    'X-Custom-Header': 'custom-value',
    'X-API-Version': '1.0.0'
  };
  
  // Set status code
  set.status = 202; // Accepted
  
  return { message: 'Request accepted' };
});
```

## Redirects

```typescript
router.get('/api/old-url', async ({ set }) => {
  set.redirect = '/api/new-url';
  return null;
});

router.get('/api/external-redirect', async ({ set }) => {
  set.redirect = 'https://example.com';
  return null;
});
```

## File Upload Handling

```typescript
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

router.post('/api/upload', 
  upload.single('file'), // Multer middleware
  async ({ file, set }) => {
    if (!file) {
      set.status = 400;
      return { error: 'No file uploaded' };
    }
    
    // Process the uploaded file
    const result = await processFile(file.path);
    
    set.status = 201;
    return { 
      success: true,
      filename: file.originalname,
      size: file.size,
      result 
    };
  }
);
```

## Advanced Examples

### Response Caching

```typescript
router.get('/api/cached-data', async ({ set }) => {
  // Cache response for 1 hour
  set.cache = '1h';
  
  // Set custom cache headers
  set.headers = {
    'Cache-Control': 'public, max-age=3600',
    'ETag': 'some-etag-value'
  };
  
  return { data: await getCachedData() };
});
```

### Custom Error Handling

```typescript
router.get('/api/error', async ({ set }) => {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    set.status = 500;
    set.content = 'json';
    return { 
      error: 'Internal Server Error',
      message: error.message 
    };
  }
});
```

### Streaming Responses

```typescript
router.get('/api/stream', async ({ request, response }) => {
  set.content = 'text';
  set.headers = {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked'
  };
  
  // Return a readable stream
  return createReadStream('large-file.txt');
});
```

### Authentication Flow

```typescript
interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
}

router.post('/api/auth/login', async ({ body, set }) => {
  const { email, password } = body;
  
  // Validate credentials
  const user = await authenticateUser(email, password);
  if (!user) {
    set.status = 401;
    return { error: 'Invalid credentials' };
  }
  
  // Generate JWT token
  const token = generateToken(user);
  
  // Set HTTP-only cookie
  set.cookies = [{
    name: 'session_token',
    value: token,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }];
  
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    token
  } as LoginResponse;
});
```

## API Reference

### RouterHandler Type

```typescript
type RouterHandler<ResponseBody = any, RequestBody = Record<string, any>> = (context: {
  request: express.Request;
  response: express.Response;
  set: IRouterSet;
  store: Record<string, any>;
  body: RequestBody;
  query: Record<string, string>;
  params: Record<string, string>;
  rawBody: string;
}) => Promise<ResponseBody>;
```

### IRouterSet Interface

```typescript
interface IRouterSet {
  status: number;              // HTTP status code
  headers: Record<string, string>;  // Custom headers
  redirect: string | null;     // Redirect URL
  content: IRouterSetContent;  // Response content type
  cookies: Cookie[];           // Cookies to set
  cache: string | null;        // Cache duration (e.g., '1h', '30d')
}
```

### IRouterSetContent Types

```typescript
type IRouterSetContent =
  | { filename: string; type: 'csv' }  // CSV download
  | string                           // Text content
  | 'gif' | 'png' | 'svg' | 'webp'   // Image types (base64)
  | 'json'                           // JSON response
  | 'xml'                            // XML response
  | 'html'                           // HTML response
  | 'text';                          // Plain text
```

### Supported HTTP Methods

- `router.get()` - GET requests
- `router.post()` - POST requests
- `router.put()` - PUT requests
- `router.patch()` - PATCH requests
- `router.delete()` - DELETE requests
- `router.options()` - OPTIONS requests
- `router.head()` - HEAD requests
- `router.all()` - All HTTP methods

## Best Practices

1. **Type Safety**: Always define TypeScript interfaces for your request and response types
2. **Error Handling**: Use proper HTTP status codes and structured error responses
3. **Security**: Set appropriate cookie options (httpOnly, secure, sameSite)
4. **Performance**: Use caching headers for static or infrequently changing data
5. **Validation**: Use middleware for input validation before processing requests
6. **Documentation**: Keep your route handlers well-documented with JSDoc comments

## Error Handling

The library provides built-in error handling that automatically formats errors and sets appropriate HTTP status codes:

```typescript
// Custom errors will be automatically handled
router.get('/api/protected', async () => {
  throw new LevoError.Platform('authentication.UNAUTHORIZED');
  // This will automatically return a 401 response
});
```

## Configuration

The server can be configured with various options:

```typescript
configureServer({
  app,
  cors: {
    allowed_domain: 'yourdomain.com'  // Optional CORS restriction
  },
  with_rate_limiter: true  // Enable/disable rate limiting (default: true)
});
```

This library provides a powerful yet simple interface for building REST APIs with enhanced features for common web development tasks while maintaining full compatibility with the Express ecosystem.