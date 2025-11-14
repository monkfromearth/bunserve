/**
 * 11. Sessions Example
 *
 * This example demonstrates session management:
 * - Cookie-based sessions
 * - Login/logout flow
 * - Session persistence
 * - CSRF protection
 *
 * Run: bun 11-sessions.ts
 */

import { bunserve, sessions, generate_csrf_token, validate_csrf_token, error_handler } from '../src/index';

const app = bunserve();
app.use(error_handler());

// Session middleware
app.use(sessions({
  secret: 'your-secret-key-change-in-production',
  max_age: 24 * 60 * 60 * 1000,  // 24 hours
  cookie_options: {
    http_only: true,
    secure: false,  // Set to true in production with HTTPS
    same_site: 'lax'
  }
}));

// Simple user database
const users = [
  { id: '1', username: 'alice', password: 'password123' },
  { id: '2', username: 'bob', password: 'password456' }
];

// Home page
app.get('/', ({ request }) => {
  const session = (request as any).session;

  return {
    message: 'Session management example',
    logged_in: !!session.data.user_id,
    user: session.data.user_id ? {
      id: session.data.user_id,
      username: session.data.username
    } : null
  };
});

// Login
app.post('/login', ({ request, body }) => {
  const session = (request as any).session;

  // Find user
  const user = users.find(u =>
    u.username === body.username && u.password === body.password
  );

  if (!user) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  // Store user in session
  session.data.user_id = user.id;
  session.data.username = user.username;

  return {
    message: 'Logged in successfully',
    user: {
      id: user.id,
      username: user.username
    }
  };
});

// Logout
app.post('/logout', ({ request }) => {
  const session = (request as any).session;

  // Clear session data
  session.data = {};

  return { message: 'Logged out successfully' };
});

// Protected route
app.get('/profile', ({ request }) => {
  const session = (request as any).session;

  if (!session.data.user_id) {
    const error: any = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }

  return {
    user: {
      id: session.data.user_id,
      username: session.data.username
    },
    session_id: session.id
  };
});

// CSRF token endpoint
app.get('/csrf-token', ({ request }) => {
  const session = (request as any).session;
  const csrf_token = generate_csrf_token(session);
  session.data.csrf_token = csrf_token;

  return { csrf_token };
});

// Protected form submission with CSRF
app.post('/submit-form', ({ request, body }) => {
  const session = (request as any).session;

  if (!validate_csrf_token(session, body.csrf_token)) {
    const error: any = new Error('Invalid CSRF token');
    error.status = 403;
    throw error;
  }

  return {
    message: 'Form submitted successfully',
    data: body
  };
});

// Start server
console.log('Starting sessions server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('');
console.log('Try:');
console.log('  curl http://localhost:3000/');
console.log('  curl -X POST http://localhost:3000/login \\');
console.log('       -H "Content-Type: application/json" \\');
console.log('       -d \'{"username":"alice","password":"password123"}\' -c cookies.txt');
console.log('  curl http://localhost:3000/profile -b cookies.txt');
console.log('  curl -X POST http://localhost:3000/logout -b cookies.txt');
