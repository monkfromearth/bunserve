import { bunserve } from '../../src/index';

const app = bunserve();

// Simple routes for benchmarking
app.get('/', () => ({ message: 'Hello World' }));

app.get('/users/:id', ({ params }) => ({
  id: params.id,
  name: 'John Doe',
  email: 'john@example.com'
}));

app.post('/users', async ({ body }) => {
  // Handle null/empty bodies gracefully
  return { success: true, data: body || {} };
});

app.post('/upload', async ({ body }) => {
  // Handle file uploads with multipart/form-data
  const file = body.get?.('file');
  return {
    success: true,
    fileName: file?.name || null,
    fileSize: file?.size || 0
  };
});

app.listen(3000);
console.log('BunServe server running on http://localhost:3000');
