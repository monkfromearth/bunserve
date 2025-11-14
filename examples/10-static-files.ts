/**
 * 10. Static Files Example
 *
 * This example demonstrates serving static files:
 * - Serving files from a directory
 * - Cache headers
 * - URL prefixes
 * - Combining static files with API routes
 *
 * Run: bun 10-static-files.ts
 */

import { bunserve, static_files } from '../src/index';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const app = bunserve();

// Create a public directory with sample files
const public_dir = join(import.meta.dir, 'public');
await mkdir(public_dir, { recursive: true });

// Create sample HTML file
await writeFile(
  join(public_dir, 'index.html'),
  `<!DOCTYPE html>
<html>
<head>
  <title>BunServe Static Files</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>Static Files Example</h1>
  <p>This page is served from the static files middleware.</p>
  <script src="/script.js"></script>
</body>
</html>`
);

// Create sample CSS file
await writeFile(
  join(public_dir, 'style.css'),
  `body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.6;
}

h1 {
  color: #333;
}

p {
  color: #666;
}`
);

// Create sample JavaScript file
await writeFile(
  join(public_dir, 'script.js'),
  `console.log('Static file loaded!');
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded successfully');
});`
);

// API routes (before static files middleware)
app.get('/api/hello', () => {
  return { message: 'Hello from API' };
});

app.get('/api/data', () => {
  return { data: [1, 2, 3, 4, 5] };
});

// Serve static files
app.use(static_files({
  root: public_dir,
  cache: '7d',  // Cache for 7 days
  index: 'index.html'
}));

// 404 handler (after static files)
app.all('/*', () => {
  return { error: 'Not found' };
});

// Start server
console.log('Starting static files server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log(`Serving static files from: ${public_dir}`);
console.log('');
console.log('Try:');
console.log('  http://localhost:3000/           - index.html');
console.log('  http://localhost:3000/style.css  - CSS file');
console.log('  http://localhost:3000/script.js  - JavaScript file');
console.log('  http://localhost:3000/api/hello  - API endpoint');
