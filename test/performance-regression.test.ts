import { expect, test } from 'bun:test';
import { bunserve } from '../src';

/**
 * Performance regression tests to ensure performance doesn't degrade over time.
 * These tests establish baseline performance expectations.
 */

// Helper to measure performance
interface PerformanceResult {
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  reqPerSec: number;
}

async function measurePerformance(
  fn: () => Promise<void>,
  iterations: number = 1000
): Promise<PerformanceResult> {
  const timings: number[] = [];

  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Measure
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    await fn();
    timings.push(performance.now() - iterStart);
  }

  const totalTime = performance.now() - start;

  // Calculate statistics
  timings.sort((a, b) => a - b);
  const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
  const minMs = timings[0];
  const maxMs = timings[timings.length - 1];
  const p95Index = Math.floor(timings.length * 0.95);
  const p95Ms = timings[p95Index];
  const reqPerSec = (iterations / totalTime) * 1000;

  return { avgMs, minMs, maxMs, p95Ms, reqPerSec };
}

test('Simple GET request performance baseline', async () => {
  const app = bunserve();
  app.get('/test', () => ({ message: 'test' }));

  const result = await measurePerformance(
    async () => {
      await app.fetch(new Request('http://localhost/test'));
    },
    1000
  );

  console.log(
    `GET performance: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  // Performance expectations (these are baselines, adjust as needed)
  expect(result.avgMs).toBeLessThan(1); // Average response time < 1ms
  expect(result.p95Ms).toBeLessThan(2); // 95th percentile < 2ms
  expect(result.reqPerSec).toBeGreaterThan(5000); // > 5000 req/s
});

test('Route with parameters performance', async () => {
  const app = bunserve();
  app.get('/users/:id', ({ params }) => ({ id: params.id }));

  let counter = 0;
  const result = await measurePerformance(
    async () => {
      await app.fetch(new Request(`http://localhost/users/${counter++}`));
    },
    1000
  );

  console.log(
    `Param routing: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  expect(result.avgMs).toBeLessThan(1.5);
  expect(result.p95Ms).toBeLessThan(3);
  expect(result.reqPerSec).toBeGreaterThan(3000);
});

test('JSON body parsing performance', async () => {
  const app = bunserve();
  app.post('/data', ({ body }) => ({ received: true, data: body }));

  const testData = { name: 'Test User', email: 'test@example.com', age: 25 };

  const result = await measurePerformance(
    async () => {
      await app.fetch(
        new Request('http://localhost/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        })
      );
    },
    1000
  );

  console.log(
    `JSON parsing: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  expect(result.avgMs).toBeLessThan(2);
  expect(result.p95Ms).toBeLessThan(4);
  expect(result.reqPerSec).toBeGreaterThan(2000);
});

test('Middleware overhead performance', async () => {
  const app = bunserve();

  // Add 3 middleware
  app.use(async (_ctx, next) => {
    await next();
  });
  app.use(async (_ctx, next) => {
    await next();
  });
  app.use(async (_ctx, next) => {
    await next();
  });

  app.get('/test', () => ({ message: 'test' }));

  const result = await measurePerformance(
    async () => {
      await app.fetch(new Request('http://localhost/test'));
    },
    1000
  );

  console.log(
    `Middleware (3x): ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  // Middleware should add minimal overhead
  expect(result.avgMs).toBeLessThan(2);
  expect(result.p95Ms).toBeLessThan(4);
  expect(result.reqPerSec).toBeGreaterThan(2000);
});

test('Query parameter parsing performance', async () => {
  const app = bunserve();
  app.get('/search', ({ query }) => ({ results: query }));

  let counter = 0;
  const result = await measurePerformance(
    async () => {
      await app.fetch(
        new Request(`http://localhost/search?q=test${counter++}&page=${counter}&limit=10`)
      );
    },
    1000
  );

  console.log(
    `Query parsing: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  expect(result.avgMs).toBeLessThan(1.5);
  expect(result.p95Ms).toBeLessThan(3);
  expect(result.reqPerSec).toBeGreaterThan(3000);
});

test('Large JSON response performance', async () => {
  const app = bunserve();

  const largeData = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: 'x'.repeat(100)
  }));

  app.get('/data', () => largeData);

  const result = await measurePerformance(
    async () => {
      await app.fetch(new Request('http://localhost/data'));
    },
    500 // Fewer iterations for large responses
  );

  console.log(
    `Large JSON: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  expect(result.avgMs).toBeLessThan(5);
  expect(result.p95Ms).toBeLessThan(10);
  expect(result.reqPerSec).toBeGreaterThan(500);
});

test('404 route performance', async () => {
  const app = bunserve();
  app.get('/exists', () => ({ message: 'exists' }));

  const result = await measurePerformance(
    async () => {
      await app.fetch(new Request('http://localhost/not-found'));
    },
    1000
  );

  console.log(
    `404 handling: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  // 404s should be fast
  expect(result.avgMs).toBeLessThan(1);
  expect(result.p95Ms).toBeLessThan(2);
});

test('Complex route pattern performance', async () => {
  const app = bunserve();
  app.get('/api/v1/users/:userId/posts/:postId/comments/:commentId', ({ params }) => ({
    userId: params.userId,
    postId: params.postId,
    commentId: params.commentId
  }));

  let counter = 0;
  const result = await measurePerformance(
    async () => {
      await app.fetch(
        new Request(`http://localhost/api/v1/users/${counter}/posts/${counter + 1}/comments/${counter + 2}`)
      );
      counter++;
    },
    1000
  );

  console.log(
    `Complex routes: ${result.avgMs.toFixed(3)}ms avg, ${result.p95Ms.toFixed(3)}ms p95, ${result.reqPerSec.toFixed(0)} req/s`
  );

  expect(result.avgMs).toBeLessThan(2);
  expect(result.p95Ms).toBeLessThan(4);
  expect(result.reqPerSec).toBeGreaterThan(2000);
});
