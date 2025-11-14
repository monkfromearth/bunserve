# Response Handling

Complete guide to handling different types of responses in BunServe, including JSON, HTML, files, and custom responses.

## Response Types

BunServe automatically detects and handles different response types based on what you return from your handler.

### JSON Responses

Return JavaScript objects to send JSON responses:

```typescript
import { bunserve } from 'bunserve';

const app = bunserve();

// Simple JSON object - automatically serialized to JSON
app.get('/api/user', () => {
  return {
    id: 123,
    name: 'Alice',
    email: 'alice@example.com'
  };
  // Content-Type: application/json
  // Status: 200
});

// Array response - also serialized to JSON
app.get('/api/users', () => {
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
  // Content-Type: application/json
});

// Nested objects - BunServe handles complex structures
app.get('/api/data', () => {
  return {
    user: {
      id: 123,
      profile: {
        name: 'Alice',
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
});
```

### Text Responses

Return strings for plain text responses:

```typescript
// Plain text string - automatically detected
app.get('/hello', () => {
  return 'Hello, World!';
  // Content-Type: text/plain; charset=utf-8
  // Status: 200
});

// Multi-line text
app.get('/info', () => {
  return `
Server: BunServe
Status: Running
Uptime: ${process.uptime()} seconds
  `.trim();
  // Content-Type: text/plain; charset=utf-8
});
```

### HTML Responses

Set the content type to HTML for HTML responses:

```typescript
// HTML response - set content type explicitly
app.get('/page', ({ set }) => {
  set.content = 'html';
  return `
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Welcome to BunServe</h1>
  <p>This is a dynamically generated HTML page.</p>
</body>
</html>
  `.trim();
  // Content-Type: text/html; charset=utf-8
});

// Dynamic HTML with template literals
app.get('/user/:id', ({ params, set }) => {
  set.content = 'html';
  return `
<!DOCTYPE html>
<html>
<body>
  <h1>User Profile</h1>
  <p>User ID: ${params.id}</p>
</body>
</html>
  `.trim();
});
```

### XML Responses

Set content type to XML for XML responses:

```typescript
// XML response for RSS feeds or APIs
app.get('/feed.xml', ({ set }) => {
  set.content = 'xml';
  return `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <link>https://example.com</link>
    <description>Latest posts</description>
    <item>
      <title>Hello World</title>
      <link>https://example.com/posts/1</link>
    </item>
  </channel>
</rss>
  `.trim();
  // Content-Type: application/xml
});
```

### Binary Responses (Images, PDFs, etc.)

Serve binary files using Bun.file():

```typescript
// Serve image files
app.get('/images/:filename', ({ params }) => {
  // Bun.file() automatically detects content type from file extension
  return new Response(Bun.file(`./uploads/${params.filename}`));
  // Content-Type: image/jpeg, image/png, etc. (auto-detected)
});

// Serve PDF files
app.get('/documents/:filename', ({ params, set }) => {
  const file = Bun.file(`./documents/${params.filename}`);

  // Set content disposition to trigger download
  set.headers['Content-Disposition'] = `attachment; filename="${params.filename}"`;

  return new Response(file);
  // Content-Type: application/pdf (auto-detected)
});

// Serve specific image types
app.get('/logo.png', ({ set }) => {
  set.content = 'png';
  return new Response(Bun.file('./assets/logo.png'));
  // Content-Type: image/png
});
```

### CSV Responses

Generate and serve CSV files:

```typescript
// CSV export with download prompt
app.get('/export/users.csv', ({ set }) => {
  // Set content type and trigger download
  set.content = { type: 'csv', filename: 'users.csv' };

  // Generate CSV data
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  // Convert to CSV format
  const csv_header = 'ID,Name,Email\n';
  const csv_rows = users.map(u => `${u.id},${u.name},${u.email}`).join('\n');

  return csv_header + csv_rows;
  // Content-Type: text/csv
  // Content-Disposition: attachment; filename="users.csv"
});

// Inline CSV (display in browser instead of download)
app.get('/data.csv', ({ set }) => {
  set.content = 'csv';  // No filename = inline display

  return 'Name,Age\nAlice,30\nBob,25';
  // Content-Type: text/csv
});
```

## Status Codes

Control HTTP status codes using the `set.status` property:

### Success Codes (2xx)

```typescript
// 200 OK - default for successful GET/PUT/PATCH
app.get('/user/:id', ({ params }) => {
  return { id: params.id };
  // Status: 200 (default)
});

// 201 Created - for successful resource creation
app.post('/users', ({ body, set }) => {
  const user = createUser(body);
  set.status = 201;  // Indicates successful creation
  return user;
  // Status: 201
});

// 202 Accepted - for async processing
app.post('/jobs', ({ body, set }) => {
  const job = queueJob(body);
  set.status = 202;  // Indicates job accepted, processing asynchronously
  return {
    job_id: job.id,
    status: 'pending'
  };
  // Status: 202
});

// 204 No Content - for successful DELETE or operations with no response body
app.delete('/user/:id', ({ params, set }) => {
  deleteUser(params.id);
  set.status = 204;  // Indicates success with no response body
  return null;
  // Status: 204
  // Body: (empty)
});
```

### Redirection (3xx)

```typescript
// 301 Moved Permanently - permanent redirect
app.get('/old-page', ({ set }) => {
  set.status = 301;
  set.redirect = '/new-page';  // Permanent redirect to new location
  // Status: 301
  // Location: /new-page
});

// 302 Found - temporary redirect (default)
app.get('/temp-redirect', ({ set }) => {
  set.redirect = '/target-page';  // Temporary redirect
  // Status: 302 (default)
  // Location: /target-page
});

// 307 Temporary Redirect - preserves HTTP method
app.post('/checkout', ({ set }) => {
  set.status = 307;
  set.redirect = '/payment';  // Redirects POST to /payment
  // Status: 307
  // Location: /payment
});
```

### Client Errors (4xx)

```typescript
// 400 Bad Request - invalid request data
app.post('/users', ({ body, set }) => {
  if (!body.email) {
    set.status = 400;
    return {
      error: 'Email is required',
      details: { field: 'email' }
    };
  }
  // Status: 400
});

// 401 Unauthorized - authentication required
app.get('/profile', ({ request, set }) => {
  const token = request.headers.get('authorization');
  if (!token) {
    set.status = 401;
    return { error: 'Authentication required' };
  }
  // Status: 401
});

// 403 Forbidden - authenticated but not authorized
app.delete('/admin/users/:id', ({ set }) => {
  if (!isAdmin()) {
    set.status = 403;
    return { error: 'Admin access required' };
  }
  // Status: 403
});

// 404 Not Found - resource doesn't exist
app.get('/user/:id', ({ params, set }) => {
  const user = findUser(params.id);
  if (!user) {
    set.status = 404;
    return { error: 'User not found' };
  }
  return user;
  // Status: 404
});

// 409 Conflict - resource conflict (e.g., duplicate)
app.post('/users', ({ body, set }) => {
  if (emailExists(body.email)) {
    set.status = 409;
    return {
      error: 'Email already registered',
      details: { field: 'email' }
    };
  }
  // Status: 409
});

// 429 Too Many Requests - server overloaded
app.get('/api/data', ({ set }) => {
  if (isServerOverloaded()) {
    set.status = 429;
    set.headers['Retry-After'] = '60';  // Retry after 60 seconds
    return { error: 'Server temporarily overloaded' };
  }
  // Status: 429
});
```

### Server Errors (5xx)

```typescript
// 500 Internal Server Error - generic server error
app.get('/data', ({ set }) => {
  try {
    return fetchData();
  } catch (error) {
    set.status = 500;
    return { error: 'Internal server error' };
  }
  // Status: 500
});

// 503 Service Unavailable - temporary downtime
app.get('/api/users', ({ set }) => {
  if (!isDatabaseConnected()) {
    set.status = 503;
    set.headers['Retry-After'] = '120';  // Retry after 2 minutes
    return {
      error: 'Service temporarily unavailable',
      message: 'Database maintenance in progress'
    };
  }
  // Status: 503
});
```

## Custom Headers

Add custom HTTP headers using `set.headers`:

```typescript
// Add custom headers
app.get('/api/data', ({ set }) => {
  // Add single header
  set.headers['X-API-Version'] = '1.0';

  // Add multiple headers
  set.headers['X-Request-ID'] = crypto.randomUUID();
  set.headers['X-Response-Time'] = `${Date.now()}ms`;

  return { data: 'response' };
});

// Security headers
app.get('/secure', ({ set }) => {
  set.headers['X-Content-Type-Options'] = 'nosniff';
  set.headers['X-Frame-Options'] = 'DENY';
  set.headers['X-XSS-Protection'] = '1; mode=block';

  return { secure: true };
});

// CORS headers (better to use cors() middleware)
app.get('/api/public', ({ set }) => {
  set.headers['Access-Control-Allow-Origin'] = '*';
  set.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';

  return { public: true };
});
```

## Caching

Control browser and CDN caching with the `set.cache` property:

```typescript
// Cache for specific duration
app.get('/static/logo.png', ({ set }) => {
  set.cache = '1d';  // Cache for 1 day
  return new Response(Bun.file('./assets/logo.png'));
  // Cache-Control: public, max-age=86400
});

// Cache duration formats
app.get('/examples', ({ set }) => {
  set.cache = '1h';   // 1 hour
  set.cache = '30m';  // 30 minutes
  set.cache = '1d';   // 1 day
  set.cache = '7d';   // 7 days
  set.cache = '1y';   // 1 year

  return { examples: true };
});

// No caching
app.get('/api/realtime', ({ set }) => {
  set.cache = 'no-cache';  // Disable caching
  return {
    timestamp: Date.now(),
    data: 'realtime'
  };
  // Cache-Control: no-cache, no-store, must-revalidate
});

// Private caching (browser only, not CDN)
app.get('/user/dashboard', ({ set }) => {
  set.cache = 'private, max-age=3600';  // Cache in browser only for 1 hour
  return { dashboard: 'data' };
  // Cache-Control: private, max-age=3600
});
```

## File Serving

Serve static files and handle file downloads:

### Static File Serving

```typescript
// Serve single file
app.get('/downloads/manual.pdf', () => {
  return new Response(Bun.file('./public/manual.pdf'));
  // Content-Type: application/pdf (auto-detected)
});

// Serve files from parameter
app.get('/files/:filename', ({ params }) => {
  const file_path = `./uploads/${params.filename}`;
  return new Response(Bun.file(file_path));
  // Content-Type: (auto-detected from extension)
});

// Serve with cache headers
app.get('/static/:filename', ({ params, set }) => {
  set.cache = '1d';  // Cache for 1 day
  return new Response(Bun.file(`./public/${params.filename}`));
});
```

### File Downloads

```typescript
// Trigger download with custom filename
app.get('/download/:id', ({ params, set }) => {
  const file = getFileById(params.id);

  // Set Content-Disposition to trigger download
  set.headers['Content-Disposition'] = `attachment; filename="${file.name}"`;

  return new Response(Bun.file(file.path));
});

// Inline display (PDF, images) vs download
app.get('/view/:id', ({ params, query, set }) => {
  const file = getFileById(params.id);

  // Download if ?download=true, otherwise display inline
  if (query.download === 'true') {
    set.headers['Content-Disposition'] = `attachment; filename="${file.name}"`;
  } else {
    set.headers['Content-Disposition'] = `inline; filename="${file.name}"`;
  }

  return new Response(Bun.file(file.path));
});
```

### File Streaming

```typescript
// Stream large files efficiently
app.get('/stream/video/:id', ({ params, set }) => {
  const video = getVideoById(params.id);

  // Set content type for video
  set.headers['Content-Type'] = 'video/mp4';
  set.headers['Accept-Ranges'] = 'bytes';  // Enable range requests for seeking

  // Bun.file() automatically handles streaming
  return new Response(Bun.file(video.path));
});
```

## Content Negotiation

Serve different formats based on Accept header:

```typescript
// Content negotiation based on Accept header
app.get('/api/data', ({ request, set }) => {
  const accept = request.headers.get('accept');

  const data = { id: 1, name: 'Alice' };

  // Return XML if requested
  if (accept?.includes('application/xml')) {
    set.content = 'xml';
    return `
<?xml version="1.0"?>
<user>
  <id>${data.id}</id>
  <name>${data.name}</name>
</user>
    `.trim();
  }

  // Return CSV if requested
  if (accept?.includes('text/csv')) {
    set.content = { type: 'csv', filename: 'data.csv' };
    return `id,name\n${data.id},${data.name}`;
  }

  // Default to JSON
  return data;
});
```

## Response Compression

While BunServe doesn't include compression middleware by default, you can implement it:

```typescript
// Manual compression (Brotli example)
import { brotliCompressSync } from 'node:zlib';

app.get('/api/large-data', ({ request, set }) => {
  const data = generateLargeDataset();
  const json_string = JSON.stringify(data);

  // Check if client accepts Brotli compression
  const accept_encoding = request.headers.get('accept-encoding') || '';

  if (accept_encoding.includes('br')) {
    // Compress using Brotli
    const compressed = brotliCompressSync(Buffer.from(json_string));
    set.headers['Content-Encoding'] = 'br';
    set.headers['Content-Type'] = 'application/json';
    return new Response(compressed);
  }

  // Return uncompressed if client doesn't support Brotli
  return data;
});
```

## Streaming Responses

Stream data to the client for long-running operations:

```typescript
// Server-Sent Events (SSE) for real-time updates
app.get('/events', ({ set }) => {
  // Set headers for SSE
  set.headers['Content-Type'] = 'text/event-stream';
  set.headers['Cache-Control'] = 'no-cache';
  set.headers['Connection'] = 'keep-alive';

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      // Send events every second
      const interval = setInterval(() => {
        const message = `data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      }, 1000);

      // Cleanup on stream close
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 10000);  // Close after 10 seconds
    }
  });

  return new Response(stream);
});
```

## Error Responses

Consistent error response format:

```typescript
// Using error_handler middleware (recommended)
import { bunserve, error_handler } from 'bunserve';

const app = bunserve();
app.use(error_handler());

app.get('/users/:id', ({ params }) => {
  const user = findUser(params.id);

  if (!user) {
    // Throw error with status property
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
  // Error response format:
  // {
  //   "error": "User not found",
  //   "status": 404
  // }
});

// Manual error responses
app.get('/manual-error', ({ set }) => {
  set.status = 400;
  return {
    error: 'Invalid request',
    message: 'Email parameter is required',
    details: {
      field: 'email',
      code: 'REQUIRED_FIELD'
    }
  };
});
```

## Best Practices

### 1. Use Appropriate Status Codes

```typescript
// Good - specific status codes
app.post('/users', ({ body, set }) => {
  if (!body.email) {
    set.status = 400;  // Bad Request
    return { error: 'Email required' };
  }

  const user = createUser(body);
  set.status = 201;  // Created
  return user;
});

// Avoid - generic 200 for everything
app.post('/users', ({ body }) => {
  if (!body.email) {
    return { success: false, error: 'Email required' };  // Still 200!
  }
  return { success: true, user: createUser(body) };
});
```

### 2. Use Auto-Detection When Possible

```typescript
// Good - let BunServe auto-detect
app.get('/users', () => {
  return [{ id: 1 }, { id: 2 }];  // Auto-detected as JSON
});

// Avoid - manual Content-Type when unnecessary
app.get('/users', ({ set }) => {
  set.headers['Content-Type'] = 'application/json';  // Unnecessary
  return JSON.stringify([{ id: 1 }, { id: 2 }]);     // Manual serialization
});
```

### 3. Cache Static Resources

```typescript
// Good - cache static assets
app.get('/assets/:filename', ({ params, set }) => {
  set.cache = '1y';  // Cache for 1 year
  return new Response(Bun.file(`./public/${params.filename}`));
});

// Avoid - no caching for static assets
app.get('/assets/:filename', ({ params }) => {
  return new Response(Bun.file(`./public/${params.filename}`));  // Re-fetched every time
});
```

### 4. Use Proper Content Disposition

```typescript
// Good - trigger download for files
app.get('/download/:id', ({ params, set }) => {
  const file = getFile(params.id);
  set.headers['Content-Disposition'] = `attachment; filename="${file.name}"`;
  return new Response(Bun.file(file.path));
});

// Avoid - files open in browser when download intended
app.get('/download/:id', ({ params }) => {
  const file = getFile(params.id);
  return new Response(Bun.file(file.path));  // Opens in browser, doesn't download
});
```

## Next Steps

- **[Routing Guide](./03-routing.md)** - Learn about routes and parameters
- **[Middleware](./04-middleware.md)** - Add CORS, logging, and more
- **[Error Handling](./05-error-handling.md)** - Handle errors gracefully
- **[Examples](./07-examples.md)** - Complete working examples
- **[API Reference](./08-api-reference.md)** - Full API documentation
