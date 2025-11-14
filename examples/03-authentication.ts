/**
 * 03. Authentication Example
 *
 * This example demonstrates JWT-based authentication:
 * - User registration and login
 * - JWT token generation
 * - Protected routes with middleware
 * - Authorization headers
 *
 * Run: bun 03-authentication.ts
 */

import { bunserve, error_handler } from '../src/index';

const app = bunserve();
app.use(error_handler());

// Simple user storage (use database in production)
interface User {
  id: string;
  username: string;
  password: string; // In production, hash passwords!
  email: string;
}

const users: User[] = [];
let next_user_id = 1;

// Simple JWT token generation (use proper JWT library in production)
function generate_token(user: User): string {
  return Buffer.from(JSON.stringify({ id: user.id, username: user.username })).toString('base64');
}

function verify_token(token: string): any {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
}

// Authentication middleware
const require_auth = async ({ request }, next) => {
  const auth_header = request.headers.get('authorization');

  if (!auth_header || !auth_header.startsWith('Bearer ')) {
    const error: any = new Error('Missing or invalid authorization header');
    error.status = 401;
    throw error;
  }

  const token = auth_header.substring(7);
  const user_data = verify_token(token);

  if (!user_data) {
    const error: any = new Error('Invalid token');
    error.status = 401;
    throw error;
  }

  // Attach user to request
  (request as any).user = user_data;

  await next();
};

// Public routes
app.post('/auth/register', ({ body }) => {
  // Validate input
  if (!body.username || !body.password || !body.email) {
    const error: any = new Error('Missing required fields');
    error.status = 400;
    throw error;
  }

  // Check if user exists
  if (users.find(u => u.username === body.username)) {
    const error: any = new Error('Username already exists');
    error.status = 409;
    throw error;
  }

  // Create user
  const user: User = {
    id: String(next_user_id++),
    username: body.username,
    password: body.password, // Hash in production!
    email: body.email
  };

  users.push(user);

  // Generate token
  const token = generate_token(user);

  return {
    message: 'User registered successfully',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  };
});

app.post('/auth/login', ({ body }) => {
  // Validate input
  if (!body.username || !body.password) {
    const error: any = new Error('Missing username or password');
    error.status = 400;
    throw error;
  }

  // Find user
  const user = users.find(u => u.username === body.username);

  if (!user || user.password !== body.password) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  // Generate token
  const token = generate_token(user);

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  };
});

// Protected routes - require authentication
app.get('/api/profile', [require_auth], ({ request }) => {
  const user = (request as any).user;

  return {
    message: 'Profile data',
    user
  };
});

app.get('/api/dashboard', [require_auth], ({ request }) => {
  const user = (request as any).user;

  return {
    message: `Welcome to the dashboard, ${user.username}!`,
    data: {
      stats: {
        posts: 42,
        followers: 128,
        following: 56
      }
    }
  };
});

// Start server
console.log('Starting authentication server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('');
console.log('Try these commands:');
console.log('');
console.log('1. Register a user:');
console.log('   curl -X POST http://localhost:3000/auth/register \\');
console.log('        -H "Content-Type: application/json" \\');
console.log('        -d \'{"username":"alice","password":"secret123","email":"alice@example.com"}\'');
console.log('');
console.log('2. Login:');
console.log('   curl -X POST http://localhost:3000/auth/login \\');
console.log('        -H "Content-Type: application/json" \\');
console.log('        -d \'{"username":"alice","password":"secret123"}\'');
console.log('');
console.log('3. Access protected route (replace TOKEN with actual token):');
console.log('   curl http://localhost:3000/api/profile \\');
console.log('        -H "Authorization: Bearer TOKEN"');
