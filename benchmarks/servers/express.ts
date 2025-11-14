import express from 'express';

const app = express();

app.use(express.json());

// Simple routes for benchmarking
app.get('/', (_req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'John Doe',
    email: 'john@example.com'
  });
});

app.post('/users', (req, res) => {
  res.json({ success: true, data: req.body });
});

app.listen(3000, () => {
  console.log('Express server running on http://localhost:3000');
});
