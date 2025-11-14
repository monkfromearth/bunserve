/**
 * 08. Database Integration Example
 *
 * This example demonstrates Bun SQLite database integration:
 * - Creating tables
 * - CRUD operations
 * - Parameterized queries
 * - Error handling
 *
 * Run: bun 08-database.ts
 */

import { bunserve, error_handler } from '../src/index';
import { Database } from 'bun:sqlite';

const app = bunserve();
app.use(error_handler());

// Initialize database
const db = new Database(':memory:'); // Use file path for persistent storage

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert sample data
db.run('INSERT OR IGNORE INTO users (username, email) VALUES (?, ?)', ['alice', 'alice@example.com']);
db.run('INSERT OR IGNORE INTO users (username, email) VALUES (?, ?)', ['bob', 'bob@example.com']);

// Get all users
app.get('/users', ({ query }) => {
  const limit = query.limit ? Number.parseInt(query.limit) : 10;
  const offset = query.offset ? Number.parseInt(query.offset) : 0;

  const users = db.query('SELECT * FROM users LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.query('SELECT COUNT(*) as count FROM users').get() as any;

  return {
    users,
    total: total.count,
    limit,
    offset
  };
});

// Get user by ID
app.get('/users/:id', ({ params }) => {
  const user = db.query('SELECT * FROM users WHERE id = ?').get(params.id);

  if (!user) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return { user };
});

// Create user
app.post('/users', ({ body }) => {
  if (!body.username || !body.email) {
    const error: any = new Error('Missing username or email');
    error.status = 400;
    throw error;
  }

  try {
    const result = db.run(
      'INSERT INTO users (username, email) VALUES (?, ?)',
      [body.username, body.email]
    );

    const user = db.query('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    return {
      message: 'User created',
      user
    };
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      const error: any = new Error('Username already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
});

// Update user
app.put('/users/:id', ({ params, body }) => {
  const result = db.run(
    'UPDATE users SET username = ?, email = ? WHERE id = ?',
    [body.username, body.email, params.id]
  );

  if (result.changes === 0) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const user = db.query('SELECT * FROM users WHERE id = ?').get(params.id);

  return {
    message: 'User updated',
    user
  };
});

// Delete user
app.delete('/users/:id', ({ params }) => {
  const result = db.run('DELETE FROM users WHERE id = ?', [params.id]);

  if (result.changes === 0) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return { message: 'User deleted' };
});

// Start server
console.log('Starting database server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('Database: In-memory SQLite');
console.log('');
console.log('Try:');
console.log('  GET    /users');
console.log('  GET    /users/1');
console.log('  POST   /users');
console.log('  PUT    /users/1');
console.log('  DELETE /users/1');
