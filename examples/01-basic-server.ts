/**
 * 01. Basic Server Example
 *
 * This example demonstrates the basics of creating a BunServe application:
 * - Creating an app instance
 * - Defining simple routes
 * - Starting the server
 *
 * Run: bun 01-basic-server.ts
 */

import { bunserve } from '../src/index';

// Create a new BunServe application
const app = bunserve();

// Define a simple GET route
app.get('/', () => {
  return { message: 'Hello World!' };
});

// Route with text response
app.get('/text', () => {
  return 'Hello from BunServe!';
});

// Route with HTML response
app.get('/html', ({ set }) => {
  set.content = 'html';
  return '<h1>Hello World!</h1><p>This is HTML from BunServe</p>';
});

// Route with route parameters
app.get('/hello/:name', ({ params }) => {
  return { message: `Hello, ${params.name}!` };
});

// POST route with body parsing
app.post('/echo', ({ body }) => {
  return { received: body };
});

// Route with query parameters
app.get('/search', ({ query }) => {
  return {
    query: query.q,
    page: query.page || '1'
  };
});

// 404 catch-all route
app.all('/*', () => {
  return { error: 'Not found' };
});

// Start the server
console.log('Starting basic server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('Try:');
console.log('  GET  http://localhost:3000/');
console.log('  GET  http://localhost:3000/text');
console.log('  GET  http://localhost:3000/html');
console.log('  GET  http://localhost:3000/hello/World');
console.log('  POST http://localhost:3000/echo');
console.log('  GET  http://localhost:3000/search?q=test&page=2');
