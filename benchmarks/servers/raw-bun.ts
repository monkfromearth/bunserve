// Raw Bun.serve using native routes API
Bun.serve({
  port: 3000,
  routes: {
    '/': {
      GET: () => Response.json({ message: 'Hello World' })
    },
    '/users/:id': {
      GET: (req: any) =>
        Response.json({
          id: req.params.id,
          name: 'John Doe',
          email: 'john@example.com'
        })
    },
    '/users': {
      POST: async (req: Request) => {
        const body = await req.json();
        return Response.json({ success: true, data: body });
      }
    }
  }
});

console.log('Raw Bun.serve server running on http://localhost:3000');
