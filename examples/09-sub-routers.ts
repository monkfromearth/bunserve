/**
 * 09. Sub-Routers Example
 *
 * This example demonstrates modular routing with sub-routers:
 * - Creating separate routers for different features
 * - Mounting routers at different paths
 * - API versioning
 * - Organized route structure
 *
 * Run: bun 09-sub-routers.ts
 */

import { bunserve, router } from '../src/index';

const app = bunserve();

// Users router
const users_router = router();

users_router.get('/', () => {
  return { users: ['alice', 'bob', 'charlie'] };
});

users_router.get('/:id', ({ params }) => {
  return { user: { id: params.id, name: 'User ' + params.id } };
});

users_router.post('/', ({ body }) => {
  return { message: 'User created', user: body };
});

// Posts router
const posts_router = router();

posts_router.get('/', () => {
  return { posts: ['Post 1', 'Post 2', 'Post 3'] };
});

posts_router.get('/:id', ({ params }) => {
  return { post: { id: params.id, title: 'Post ' + params.id } };
});

posts_router.post('/', ({ body }) => {
  return { message: 'Post created', post: body };
});

// API v1 router
const api_v1 = router();
api_v1.use('/users', users_router);
api_v1.use('/posts', posts_router);

// API v2 router (with different structure)
const api_v2 = router();

api_v2.get('/users', () => {
  return { version: 'v2', users: [] };
});

api_v2.get('/posts', () => {
  return { version: 'v2', posts: [] };
});

// Mount API routers
app.use('/api/v1', api_v1);
app.use('/api/v2', api_v2);

// Root routes
app.get('/', () => {
  return {
    message: 'Sub-routers example',
    endpoints: {
      v1: '/api/v1',
      v2: '/api/v2'
    }
  };
});

// Start server
console.log('Starting sub-routers server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('');
console.log('API v1 endpoints:');
console.log('  GET /api/v1/users');
console.log('  GET /api/v1/users/:id');
console.log('  GET /api/v1/posts');
console.log('  GET /api/v1/posts/:id');
console.log('');
console.log('API v2 endpoints:');
console.log('  GET /api/v2/users');
console.log('  GET /api/v2/posts');
