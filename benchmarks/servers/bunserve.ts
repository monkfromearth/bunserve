import { bunserve } from '../../src/index';

const app = bunserve();

// Simple routes for benchmarking
app.get('/', () => ({ message: 'Hello World' }));

app.get('/users/:id', ({ params }) => ({
  id: params.id,
  name: 'John Doe',
  email: 'john@example.com'
}));

app.post('/users', async ({ request }) => {
  try {
    const body = await request.json();
    return { success: true, data: body };
  } catch (error) {
    return { success: true, data: {} };
  }
});

app.listen(3000);
console.log('BunServe server running on http://localhost:3000');
