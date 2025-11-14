import { expect, test } from 'bun:test';
import { bunserve } from '../src';

// Helper function to get memory usage
function getMemoryUsage() {
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true); // Force garbage collection
  }
  return process.memoryUsage();
}

// Helper to measure memory growth
async function measureMemoryGrowth(
  fn: () => Promise<void>,
  iterations: number
): Promise<{ initialMB: number; finalMB: number; growthMB: number }> {
  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Force GC and measure initial
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const initialMemory = getMemoryUsage();
  const initialMB = initialMemory.heapUsed / 1024 / 1024;

  // Run iterations
  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  // Force GC and measure final
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const finalMemory = getMemoryUsage();
  const finalMB = finalMemory.heapUsed / 1024 / 1024;
  const growthMB = finalMB - initialMB;

  return { initialMB, finalMB, growthMB };
}

test('No memory leak in simple GET requests', async () => {
  const app = bunserve();
  app.get('/test', () => ({ message: 'test' }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request('http://localhost/test'));
    },
    1000 // 1000 iterations
  );

  console.log(
    `Memory: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  // Memory growth should be minimal (less than 5MB for 1000 requests)
  expect(result.growthMB).toBeLessThan(5);
});

test('No memory leak with route parameters', async () => {
  const app = bunserve();
  app.get('/users/:id', ({ params }) => ({ id: params.id }));

  let counter = 0;
  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request(`http://localhost/users/${counter++}`));
    },
    1000
  );

  console.log(
    `Memory with params: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(5);
});

test('No memory leak with JSON body parsing', async () => {
  const app = bunserve();
  app.post('/data', async ({ body }) => ({ received: true, data: body }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(
        new Request('http://localhost/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data', value: 123 })
        })
      );
    },
    1000
  );

  console.log(
    `Memory with JSON: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(5);
});

test('No memory leak with middleware execution', async () => {
  const app = bunserve();

  // Add multiple middleware
  app.use(async (_ctx, next) => {
    await next();
  });
  app.use(async (_ctx, next) => {
    await next();
  });

  app.get('/test', () => ({ message: 'test' }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request('http://localhost/test'));
    },
    1000
  );

  console.log(
    `Memory with middleware: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(5);
});

test('No memory leak with query parameters', async () => {
  const app = bunserve();
  app.get('/search', ({ query }) => ({ query }));

  let counter = 0;
  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(
        new Request(`http://localhost/search?q=test${counter++}&page=${counter}`)
      );
    },
    1000
  );

  console.log(
    `Memory with query params: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(5);
});

test('No memory leak with large JSON payloads', async () => {
  const app = bunserve();
  app.post('/upload', async ({ body }) => ({ size: JSON.stringify(body).length }));

  // Create a reasonably large payload
  const largeData = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: 'x'.repeat(100)
  }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(
        new Request('http://localhost/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(largeData)
        })
      );
    },
    500 // Fewer iterations for large payloads
  );

  console.log(
    `Memory with large payloads: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  // Allow more growth for large payloads, but still should be minimal
  expect(result.growthMB).toBeLessThan(10);
});

test('No memory leak with cookies', async () => {
  const app = bunserve();

  app.get('/set-cookie', ({ cookies }) => {
    cookies.set('session', 'test-session-id');
    return { success: true };
  });

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request('http://localhost/set-cookie'));
    },
    1000
  );

  console.log(
    `Memory with cookies: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(5);
});

test('No memory leak with error handling', async () => {
  const app = bunserve();

  app.get('/error', () => {
    throw new Error('Test error');
  });

  const result = await measureMemoryGrowth(
    async () => {
      try {
        await app.fetch(new Request('http://localhost/error'));
      } catch {
        // Ignore errors
      }
    },
    1000
  );

  console.log(
    `Memory with errors: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB (growth: ${result.growthMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(5);
});

test('Memory stability under concurrent requests', async () => {
  const app = bunserve();
  app.get('/concurrent', () => ({ timestamp: Date.now() }));

  const initialMemory = getMemoryUsage();
  const initialMB = initialMemory.heapUsed / 1024 / 1024;

  // Run 10 batches of 100 concurrent requests each
  for (let batch = 0; batch < 10; batch++) {
    const promises = Array.from({ length: 100 }, () =>
      app.fetch(new Request('http://localhost/concurrent'))
    );
    await Promise.all(promises);

    // Force GC after each batch
    if (typeof Bun !== 'undefined' && Bun.gc) {
      Bun.gc(true);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const finalMemory = getMemoryUsage();
  const finalMB = finalMemory.heapUsed / 1024 / 1024;
  const growthMB = finalMB - initialMB;

  console.log(
    `Memory under load: ${initialMB.toFixed(2)}MB -> ${finalMB.toFixed(2)}MB (growth: ${growthMB.toFixed(2)}MB)`
  );

  // Even under concurrent load, memory should stabilize
  expect(growthMB).toBeLessThan(10);
});
