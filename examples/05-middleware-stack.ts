/**
 * 05. Middleware Stack Example
 *
 * This example demonstrates a production-ready middleware stack:
 * - Error handling
 * - CORS configuration
 * - Request logging
 * - Security headers
 * - Request ID tracking
 *
 * Run: bun 05-middleware-stack.ts
 */

import { bunserve, error_handler, cors, logger, security } from '../src/index';

const app = bunserve();

// 1. Error handler - should be first
app.use(error_handler({
  include_stack: process.env.NODE_ENV !== 'production'
}));

// 2. Security headers
app.use(security({
  content_security_policy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"]
    }
  }
}));

// 3. CORS - allow specific origins
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 4. Logger - log all requests
app.use(logger({
  format: 'dev',
  skip: (path) => path === '/health'
}));

// 5. Request ID middleware
app.use(async ({ set }, next) => {
  set.headers['X-Request-ID'] = crypto.randomUUID();
  await next();
});

// 6. Response time middleware
app.use(async ({ set }, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  set.headers['X-Response-Time'] = `${duration.toFixed(2)}ms`;
});

// Routes
app.get('/', () => {
  return {
    message: 'API with production middleware stack',
    version: '1.0.0'
  };
});

app.get('/api/data', () => {
  return {
    data: [1, 2, 3, 4, 5],
    timestamp: new Date()
  };
});

// Health check (logging skipped)
app.get('/health', () => {
  return {
    status: 'healthy',
    uptime: process.uptime()
  };
});

// Route that throws an error (for testing error handler)
app.get('/error', () => {
  const error: any = new Error('Something went wrong');
  error.status = 500;
  throw error;
});

// Start server
console.log('Starting server with middleware stack...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('');
console.log('Middleware enabled:');
console.log('  ✓ Error handler');
console.log('  ✓ Security headers');
console.log('  ✓ CORS');
console.log('  ✓ Logger (dev format)');
console.log('  ✓ Request ID');
console.log('  ✓ Response time');
