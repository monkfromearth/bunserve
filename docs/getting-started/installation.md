# Getting Started Guide

## Installation

```bash
bun add bunserve
```

## Quick Start

### Basic Server

```typescript
import { create_router, create_server } from 'bunserve'

const router = create_router()

router.get('/hello', () => 'Hello World!')
router.get('/users/:id', ({ params }) => ({ id: params.id }))

const server = create_server({ router })
server.listen(3000)
```

### Run the Server

```bash
bun run server.ts
```

## Your First API

```typescript
import { create_router, create_server } from 'bunserve'

const router = create_router()

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
router.get('/users', () => users)

// Get user by ID
router.get('/users/:id', ({ params }) => {
  const user = users.find(u => u.id === params.id)
  if (!user) {
    const { set } = context
    set.status = 404
    return { error: 'User not found' }
  }
  return user
})

// Create new user
router.post('/users', async ({ body }) => {
  const new_user: User = {
    id: String(users.length + 1),
    name: body.name,
    email: body.email
  }
  users.push(new_user)
  
  const { set } = context
  set.status = 201
  return new_user
})

const server = create_server({ router })
server.listen(3000, () => {
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

- [Middleware Guide](../increments/1.1-middleware.md)
- [Route Parameters](../increments/0.1-basic-routing.md)
- [Response Configuration](../increments/0.2-response-context.md)
- [Context Integration](../context/bun-serve.md)