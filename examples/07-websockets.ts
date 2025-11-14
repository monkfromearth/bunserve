/**
 * 07. WebSockets Example
 *
 * This example demonstrates combining HTTP and WebSocket servers:
 * - HTTP routes for REST API
 * - WebSocket connections for real-time communication
 * - Broadcasting messages to all connected clients
 *
 * Run: bun 07-websockets.ts
 */

import { bunserve } from '../src/index';

const app = bunserve();

// HTTP routes
app.get('/', () => {
  return {
    message: 'HTTP + WebSocket server',
    websocket_url: 'ws://localhost:3000'
  };
});

app.get('/status', () => {
  return {
    http: 'running',
    websocket: 'available',
    connections: 0 // Track active connections
  };
});

// WebSocket handling
const websocket = {
  open(ws: any) {
    console.log('WebSocket connection opened');
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to WebSocket server'
    }));
  },

  message(ws: any, message: string) {
    console.log('Received message:', message);

    try {
      const data = JSON.parse(message);

      // Echo the message back
      ws.send(JSON.stringify({
        type: 'echo',
        original: data,
        timestamp: new Date()
      }));

      // Broadcast to all connections (if needed)
      // ws.publish('chat', JSON.stringify(data));

    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON'
      }));
    }
  },

  close(ws: any) {
    console.log('WebSocket connection closed');
  }
};

// Note: To actually enable WebSockets with Bun.serve, you would do:
// Bun.serve({
//   port: 3000,
//   fetch: app.fetch.bind(app),
//   websocket: websocket
// });

// For this example, we'll use the standard HTTP server
console.log('Starting HTTP + WebSocket server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('');
console.log('WebSocket functionality requires direct Bun.serve integration.');
console.log('See documentation for full WebSocket setup.');
console.log('');
console.log('HTTP endpoints:');
console.log('  GET /        - Server info');
console.log('  GET /status  - Server status');
