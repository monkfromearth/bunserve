/**
 * 02. REST API Example
 *
 * This example demonstrates building a complete REST API:
 * - CRUD operations (Create, Read, Update, Delete)
 * - RESTful routing conventions
 * - In-memory data storage
 * - Error handling
 *
 * Run: bun 02-rest-api.ts
 */

import { bunserve, error_handler } from '../src/index';

// Create app with error handler
const app = bunserve();
app.use(error_handler());

// In-memory storage for posts
interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: Date;
  updated_at: Date;
}

const posts: Post[] = [];
let next_id = 1;

// List all posts
app.get('/api/posts', () => {
  return { posts, count: posts.length };
});

// Get single post by ID
app.get('/api/posts/:id', ({ params }) => {
  const post = posts.find(p => p.id === params.id);

  if (!post) {
    const error: any = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  return { post };
});

// Create new post
app.post('/api/posts', ({ body }) => {
  // Validate required fields
  if (!body.title || !body.content || !body.author) {
    const error: any = new Error('Missing required fields: title, content, author');
    error.status = 400;
    throw error;
  }

  const post: Post = {
    id: String(next_id++),
    title: body.title,
    content: body.content,
    author: body.author,
    created_at: new Date(),
    updated_at: new Date()
  };

  posts.push(post);

  return { post, message: 'Post created successfully' };
});

// Update existing post
app.put('/api/posts/:id', ({ params, body }) => {
  const post = posts.find(p => p.id === params.id);

  if (!post) {
    const error: any = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  // Update fields
  if (body.title) post.title = body.title;
  if (body.content) post.content = body.content;
  if (body.author) post.author = body.author;
  post.updated_at = new Date();

  return { post, message: 'Post updated successfully' };
});

// Partially update post
app.patch('/api/posts/:id', ({ params, body }) => {
  const post = posts.find(p => p.id === params.id);

  if (!post) {
    const error: any = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  // Only update provided fields
  Object.assign(post, body);
  post.updated_at = new Date();

  return { post, message: 'Post updated successfully' };
});

// Delete post
app.delete('/api/posts/:id', ({ params }) => {
  const index = posts.findIndex(p => p.id === params.id);

  if (index === -1) {
    const error: any = new Error('Post not found');
    error.status = 404;
    throw error;
  }

  posts.splice(index, 1);

  return { message: 'Post deleted successfully' };
});

// Search posts
app.get('/api/posts/search', ({ query }) => {
  const search_term = query.q?.toLowerCase() || '';

  const results = posts.filter(post =>
    post.title.toLowerCase().includes(search_term) ||
    post.content.toLowerCase().includes(search_term)
  );

  return { posts: results, count: results.length };
});

// Add sample data
posts.push(
  {
    id: String(next_id++),
    title: 'Getting Started with BunServe',
    content: 'BunServe makes building APIs with Bun incredibly simple...',
    author: 'Alice',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: String(next_id++),
    title: 'Building REST APIs',
    content: 'REST APIs follow a simple pattern for CRUD operations...',
    author: 'Bob',
    created_at: new Date(),
    updated_at: new Date()
  }
);

// Start server
console.log('Starting REST API server...');
app.listen(3000);
console.log('REST API running at http://localhost:3000/api/posts');
console.log('Try:');
console.log('  GET    http://localhost:3000/api/posts');
console.log('  GET    http://localhost:3000/api/posts/1');
console.log('  POST   http://localhost:3000/api/posts');
console.log('  PUT    http://localhost:3000/api/posts/1');
console.log('  DELETE http://localhost:3000/api/posts/1');
