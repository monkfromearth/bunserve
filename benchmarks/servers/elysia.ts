import { Elysia } from 'elysia';

const app = new Elysia();

// Simple routes for benchmarking
app.get('/', () => ({ message: 'Hello World' }));

app.get('/users/:id', ({ params }) => ({
  id: params.id,
  name: 'John Doe',
  email: 'john@example.com'
}));

app.post('/users', ({ body }) => ({
  success: true,
  data: body
}));

app.listen(3000);

console.log('Elysia server running on http://localhost:3000');
