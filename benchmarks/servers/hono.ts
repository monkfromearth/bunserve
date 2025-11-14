import { Hono } from 'hono';

const app = new Hono();

// Simple routes for benchmarking
app.get('/', (c) => c.json({ message: 'Hello World' }));

app.get('/users/:id', (c) =>
  c.json({
    id: c.req.param('id'),
    name: 'John Doe',
    email: 'john@example.com'
  })
);

app.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, data: body });
});

export default {
  port: 3000,
  fetch: app.fetch
};

console.log('Hono server running on http://localhost:3000');
