# Getting Started Guide

## Installation

```bash
bun add bunserve
```

## Quick Start

### Basic Server
```typescript
import { BunServe } from 'bunserve'

const app = new BunServe()

app.get('/hello', () => 'Hello World!')
app.get('/users/:id', ({ params }) => ({ id: params.id }))

app.listen(3000)
```

### Run the Server
```bash
bun run index.ts
```

## Your First API

```typescript
import { BunServe, t } from 'bunserve'

const app = new BunServe()

// Define user interface
interface User {
  id: string
  name: string
  email: string
}

// In-memory storage
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
]

// Get all users
app.get('/users', () => users)

// Get user by ID
app.get('/users/:id', {
  schema: {
    params: t.Object({ id: t.String() }),
    response: t.Object({
      id: t.String(),
      name: t.String(),
      email: t.String()
    })
  },
  handler: ({ params }) => {
    const user = users.find(u => u.id === params.id)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  }
})

// Create new user
app.post('/users', {
  schema: {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' })
    }),
    response: t.Object({
      id: t.String(),
      name: t.String(),
      email: t.String()
    })
  },
  handler: ({ body }) => {
    const newUser: User = {
      id: String(users.length + 1),
      name: body.name,
      email: body.email
    }
    users.push(newUser)
    return newUser
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Testing Your API

```bash
# Get all users
curl http://localhost:3000/users

# Get user by ID
curl http://localhost:3000/users/1

# Create new user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "email": "alice@example.com"}'
```

## Next Steps

- [Middleware Guide](./middleware.md)
- [Schema Validation](../api-reference/schema-validation.md)
- [Type Safety Guide](../guides/type-safety.md)
- [Error Handling](../guides/error-handling.md)