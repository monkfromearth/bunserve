# Cookies & Sessions

Guide to working with cookies using Bun's native CookieMap API in BunServe.

## Overview

BunServe uses Bun's native cookie management system, which provides efficient cookie handling with automatic Set-Cookie header generation.

## Basic Cookie Operations

### Reading Cookies

```typescript
// Read cookies from the request
app.get('/profile', ({ cookies }) => {
  // Get cookie values using get() method
  const session_id = cookies.get('session_id');
  const theme = cookies.get('theme') || 'light'; // Default to 'light' if not set

  return {
    session_id,
    theme
  };
});
```

### Setting Cookies

```typescript
// Set cookies in the response
app.post('/login', ({ body, cookies }) => {
  // Authenticate user...

  // Set a simple cookie without options
  cookies.set('user_id', '12345');

  // Set a secure cookie with options
  cookies.set('session_id', 'abc123', {
    httpOnly: true,    // Prevents JavaScript access
    secure: true,      // Only sent over HTTPS
    maxAge: 3600,      // Expires in 1 hour (in seconds)
    path: '/',         // Available for entire site
    sameSite: 'strict' // Strict CSRF protection
  });

  return { success: true };
});
```

### Deleting Cookies

```typescript
// Delete a cookie
app.post('/logout', ({ cookies }) => {
  // Delete a cookie by name and path
  cookies.delete('session_id', {
    path: '/' // Must match the path used when setting the cookie
  });

  return { message: 'Logged out successfully' };
});
```

## Cookie Options

### httpOnly

Prevents JavaScript access to the cookie (recommended for security):

```typescript
// httpOnly prevents JavaScript access for security
cookies.set('session_id', 'abc123', {
  httpOnly: true // Cannot be accessed via document.cookie
});
```

### secure

Cookie only sent over HTTPS:

```typescript
// secure ensures cookie only sent over HTTPS
cookies.set('session_id', 'abc123', {
  secure: true // Only sent over HTTPS
});
```

### sameSite

Controls cross-site cookie behavior:

```typescript
// Strict: Never sent in cross-site requests (best security)
cookies.set('session_id', 'abc123', {
  sameSite: 'strict'
});

// Lax: Sent with top-level navigations (default, balanced)
cookies.set('tracking_id', 'xyz789', {
  sameSite: 'lax'
});

// None: Sent with all requests (requires secure: true for third-party)
cookies.set('widget_token', 'token123', {
  sameSite: 'none',
  secure: true
});
```

### maxAge

Cookie expiration in seconds:

```typescript
// 1 hour - cookie expires in 3600 seconds
cookies.set('temp_token', 'abc123', {
  maxAge: 3600
});

// 7 days - cookie expires in 604800 seconds
cookies.set('remember_me', 'true', {
  maxAge: 7 * 24 * 60 * 60
});

// Session cookie (deleted when browser closes)
cookies.set('session', 'xyz', {
  // No maxAge or expires means session cookie
});
```

### expires

Specific expiration date:

```typescript
const expires = new Date()
expires.setDate(expires.getDate() + 30) // 30 days from now

cookies.set('long_lived', 'token', {
  expires
})
```

### domain

Cookie domain scope:

```typescript
// Available on all subdomains
cookies.set('shared_token', 'abc123', {
  domain: '.example.com'
})

// Only available on exact domain
cookies.set('specific_token', 'xyz789', {
  domain: 'app.example.com'
})
```

### path

Cookie path scope:

```typescript
// Available on all paths
cookies.set('global', 'value', {
  path: '/'
})

// Only available under /api
cookies.set('api_token', 'token', {
  path: '/api'
})
```

## Session Management

### Simple Session System

```typescript
import { Context } from 'bunserve'

const sessions = new Map<string, {
  user_id: string
  created_at: number
  last_activity: number
}>()

// Login
app.post('/auth/login', async ({ body, cookies }) => {
  // Authenticate user
  const user = await authenticate(body.email, body.password)

  if (!user) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  // Create session
  const session_id = crypto.randomUUID()
  sessions.set(session_id, {
    user_id: user.id,
    created_at: Date.now(),
    last_activity: Date.now()
  })

  // Set session cookie
  cookies.set('session_id', session_id, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  })

  return { user }
})

// Session middleware
const require_session = async ({ cookies }, next) => {
  const session_id = cookies.get('session_id')

  if (!session_id) {
    const error: any = new Error('Not logged in');
    error.status = 401;
    throw error;
  }

  const session = sessions.get(session_id)

  if (!session) {
    const error: any = new Error('Invalid session');
    error.status = 401;
    throw error;
  }

  // Check if session expired (24 hours)
  if (Date.now() - session.last_activity > 24 * 60 * 60 * 1000) {
    sessions.delete(session_id)
    const error: any = new Error('Session expired');
    error.status = 401;
    throw error;
  }

  // Update last activity
  session.last_activity = Date.now()

  // Store in context
  Context.set({ session, user_id: session.user_id })

  await next()
}

// Protected routes
app.get('/api/profile', [require_session], () => {
  const { user_id } = Context.get<{ user_id: string }>()
  return { user: getUserById(user_id) }
})

// Logout
app.post('/auth/logout', ({ cookies }) => {
  const session_id = cookies.get('session_id')

  if (session_id) {
    sessions.delete(session_id)
    cookies.delete('session_id', { path: '/' })
  }

  return { message: 'Logged out' }
})
```

### JWT Cookie Sessions

```typescript
import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret'

// Login with JWT
app.post('/auth/login', async ({ body, cookies }) => {
  const user = await authenticate(body.email, body.password)

  if (!user) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  // Create JWT
  const token = sign(
    { user_id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  // Store in httpOnly cookie
  cookies.set('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60
  })

  return { user }
})

// JWT middleware
const require_jwt = async ({ cookies }, next) => {
  const token = cookies.get('auth_token')

  if (!token) {
    const error: any = new Error('Not logged in');
    error.status = 401;
    throw error;
  }

  try {
    const payload = verify(token, JWT_SECRET) as { user_id: string; email: string }
    Context.set({ user_id: payload.user_id, email: payload.email })
    await next()
  } catch (error) {
    const authError: any = new Error('Invalid or expired token');
    authError.status = 401;
    throw authError;
  }
}

app.get('/api/profile', [require_jwt], () => {
  const { user_id } = Context.get<{ user_id: string }>()
  return { user: getUserById(user_id) }
})
```

## Cookie Security

### Best Practices

1. **Always use httpOnly for sensitive data**:
```typescript
cookies.set('session_id', token, {
  httpOnly: true // Prevents XSS attacks
})
```

2. **Use secure in production**:
```typescript
cookies.set('session_id', token, {
  secure: process.env.NODE_ENV === 'production'
})
```

3. **Set appropriate sameSite**:
```typescript
cookies.set('session_id', token, {
  sameSite: 'strict' // Best protection against CSRF
})
```

4. **Use short expiration times**:
```typescript
cookies.set('session_id', token, {
  maxAge: 15 * 60 // 15 minutes for sensitive operations
})
```

5. **Regenerate session IDs after login**:
```typescript
app.post('/auth/login', async ({ body, cookies }) => {
  // Delete old session if exists
  const old_session = cookies.get('session_id')
  if (old_session) {
    sessions.delete(old_session)
  }

  // Create new session
  const new_session_id = crypto.randomUUID()
  sessions.set(new_session_id, { user_id: user.id })

  cookies.set('session_id', new_session_id, {
    httpOnly: true,
    secure: true
  })
})
```

### CSRF Protection

```typescript
// Generate CSRF token
const csrf_tokens = new Map<string, string>()

app.get('/auth/csrf', ({ cookies }) => {
  const csrf_token = crypto.randomUUID()
  const session_id = cookies.get('session_id')

  if (session_id) {
    csrf_tokens.set(session_id, csrf_token)
  }

  return { csrf_token }
})

// Validate CSRF token
const validate_csrf = async ({ cookies, body, request }, next) => {
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    const session_id = cookies.get('session_id')
    const csrf_token = request.headers.get('x-csrf-token') || body.csrf_token

    if (!session_id || !csrf_token) {
      const error: any = new Error('CSRF token required');
      error.status = 403;
      throw error;
    }

    const expected_token = csrf_tokens.get(session_id)

    if (csrf_token !== expected_token) {
      const error: any = new Error('Invalid CSRF token');
      error.status = 403;
      throw error;
    }
  }

  await next()
}

app.use(validate_csrf)
```

## Cookie Preferences

Store user preferences:

```typescript
// Save preferences
app.post('/preferences', ({ body, cookies }) => {
  const preferences = {
    theme: body.theme || 'light',
    language: body.language || 'en',
    timezone: body.timezone || 'UTC'
  }

  cookies.set('preferences', JSON.stringify(preferences), {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
    sameSite: 'lax'
  })

  return { preferences }
})

// Read preferences
app.get('/preferences', ({ cookies }) => {
  const preferences_str = cookies.get('preferences')

  if (!preferences_str) {
    return {
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    }
  }

  return JSON.parse(preferences_str)
})
```

## Remember Me

Implement "Remember Me" functionality:

```typescript
app.post('/auth/login', async ({ body, cookies }) => {
  const user = await authenticate(body.email, body.password)

  if (!user) {
    const error: any = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const session_id = crypto.randomUUID()
  sessions.set(session_id, { user_id: user.id })

  // Different expiration based on "remember me"
  const max_age = body.remember_me
    ? 30 * 24 * 60 * 60  // 30 days
    : 24 * 60 * 60       // 24 hours

  cookies.set('session_id', session_id, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: max_age
  })

  return { user }
})
```

## Cookie Consent

Handle cookie consent for GDPR compliance:

```typescript
app.post('/cookies/consent', ({ body, cookies }) => {
  const consent = {
    essential: true, // Always true
    analytics: body.analytics || false,
    marketing: body.marketing || false,
    timestamp: new Date().toISOString()
  }

  cookies.set('cookie_consent', JSON.stringify(consent), {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
    sameSite: 'lax'
  })

  return { consent }
})

// Check consent before setting non-essential cookies
const analytics_middleware = async ({ cookies }, next) => {
  const consent_str = cookies.get('cookie_consent')

  if (consent_str) {
    const consent = JSON.parse(consent_str)

    if (consent.analytics) {
      // Set analytics cookies
      cookies.set('analytics_id', crypto.randomUUID(), {
        maxAge: 30 * 24 * 60 * 60
      })
    }
  }

  await next()
}
```

## Testing Cookies

```typescript
import { test, expect } from 'bun:test'

test('sets session cookie on login', async () => {
  const router = create_router()

  app.post('/login', ({ cookies }) => {
    cookies.set('session_id', 'test-session', {
      httpOnly: true
    })
    return { success: true }
  })

  const server = create_server({ router })
  const response = await server.fetch(
    new Request('http://localhost/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    })
  )

  const set_cookie = response.headers.get('set-cookie')
  expect(set_cookie).toContain('session_id=test-session')
  expect(set_cookie).toContain('HttpOnly')
})
```

## Next Steps

- **[Middleware](./04-middleware.md)** - Authentication middleware
- **[Error Handling](./05-error-handling.md)** - Handle auth errors
- **[Examples](./07-examples.md)** - Complete auth examples
- **[API Reference](./08-api-reference.md)** - Full API documentation
