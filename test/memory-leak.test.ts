import { expect, test } from 'bun:test';
import { bunserve } from '../src';
import { cors } from '../src/middleware/cors';
import { logger } from '../src/middleware/logger';
import { error_handler } from '../src/middleware/error-handler';

// Helper function to get memory usage
function getMemoryUsage() {
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true); // Force garbage collection
  }
  return process.memoryUsage();
}

interface MemoryMetrics {
  initialMB: number;
  finalMB: number;
  growthMB: number;
  peakMB: number;
  gcCount: number;
  avgMemoryPerRequest: number;
}

// Enhanced helper to measure memory growth with more metrics
async function measureMemoryGrowth(
  fn: () => Promise<void>,
  iterations: number,
  options: { sampleInterval?: number; checkLeaks?: boolean } = {}
): Promise<MemoryMetrics> {
  const { sampleInterval = 100, checkLeaks = true } = options;
  const memorySnapshots: number[] = [];
  let gcCount = 0;

  // Warm up
  for (let i = 0; i < 20; i++) {
    await fn();
  }

  // Force GC and measure initial
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true);
    gcCount++;
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const initialMemory = getMemoryUsage();
  const initialMB = initialMemory.heapUsed / 1024 / 1024;
  memorySnapshots.push(initialMB);

  // Run iterations with periodic memory sampling
  for (let i = 0; i < iterations; i++) {
    await fn();

    // Sample memory periodically
    if (i % sampleInterval === 0) {
      const currentMem = process.memoryUsage().heapUsed / 1024 / 1024;
      memorySnapshots.push(currentMem);

      // Force GC periodically if checking for leaks
      if (checkLeaks && i % (sampleInterval * 2) === 0) {
        if (typeof Bun !== 'undefined' && Bun.gc) {
          Bun.gc(true);
          gcCount++;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  // Force GC and measure final
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true);
    gcCount++;
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const finalMemory = getMemoryUsage();
  const finalMB = finalMemory.heapUsed / 1024 / 1024;
  const growthMB = finalMB - initialMB;
  const peakMB = Math.max(...memorySnapshots);
  const avgMemoryPerRequest = growthMB / iterations;

  return { initialMB, finalMB, growthMB, peakMB, gcCount, avgMemoryPerRequest };
}

test('No memory leak in simple GET requests (5000 iterations)', async () => {
  const app = bunserve();
  app.get('/test', () => ({ message: 'test' }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request('http://localhost/test'));
    },
    5000 // Increased to 5000 iterations
  );

  console.log(
    `Memory: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB ` +
    `(growth: ${result.growthMB.toFixed(2)}MB, peak: ${result.peakMB.toFixed(2)}MB, ` +
    `${result.gcCount} GCs, ${(result.avgMemoryPerRequest * 1024).toFixed(2)}KB/req)`
  );

  // Memory growth should be minimal (less than 5MB for 5000 requests)
  expect(result.growthMB).toBeLessThan(5);
  expect(result.avgMemoryPerRequest).toBeLessThan(0.001); // < 1KB per request
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

// ============ ENHANCED COMPREHENSIVE MEMORY TESTS ============

test('Long-running server simulation (10,000 requests)', async () => {
  const app = bunserve();

  // Simulate realistic endpoints
  app.get('/api/users', () => ({ users: Array.from({ length: 10 }, (_, i) => ({ id: i, name: `User ${i}` })) }));
  app.post('/api/data', ({ body }) => ({ success: true, received: body }));
  app.get('/health', () => ({ status: 'ok' }));

  let requestCounter = 0;
  const result = await measureMemoryGrowth(
    async () => {
      // Mix of different endpoints
      const endpoints = ['/api/users', '/api/data', '/health'];
      const endpoint = endpoints[requestCounter % 3];

      if (endpoint === '/api/data') {
        await app.fetch(
          new Request('http://localhost/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: requestCounter, data: 'test' })
          })
        );
      } else {
        await app.fetch(new Request(`http://localhost${endpoint}`));
      }
      requestCounter++;
    },
    10000, // 10,000 iterations
    { sampleInterval: 500 }
  );

  console.log(
    `Long-running (10k): ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB ` +
    `(growth: ${result.growthMB.toFixed(2)}MB, peak: ${result.peakMB.toFixed(2)}MB, ` +
    `${(result.avgMemoryPerRequest * 1024).toFixed(3)}KB/req)`
  );

  // Should maintain stable memory even over 10k requests
  expect(result.growthMB).toBeLessThan(10);
  expect(result.avgMemoryPerRequest).toBeLessThan(0.001); // < 1KB per request
});

test('Middleware stack memory overhead (10 middleware)', async () => {
  const app = bunserve();

  // Add 10 middleware layers
  for (let i = 0; i < 10; i++) {
    app.use(async (_ctx, next) => {
      await next();
    });
  }

  app.get('/test', () => ({ message: 'test' }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request('http://localhost/test'));
    },
    3000
  );

  console.log(
    `Middleware (10x): ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB ` +
    `(growth: ${result.growthMB.toFixed(2)}MB, ${(result.avgMemoryPerRequest * 1024).toFixed(2)}KB/req)`
  );

  // Heavy middleware should still not leak
  expect(result.growthMB).toBeLessThan(7);
});

test('Real middleware stack (CORS + Logger + ErrorHandler)', async () => {
  const app = bunserve();

  // Realistic middleware stack
  app.use(cors({ preset: 'development' }));
  app.use(logger({ preset: 'production', log: () => {} })); // Silent logger
  app.use(error_handler());

  app.get('/api/data', () => ({ data: [1, 2, 3] }));
  app.post('/api/create', ({ body }) => ({ created: true, data: body }));

  let counter = 0;
  const result = await measureMemoryGrowth(
    async () => {
      if (counter % 2 === 0) {
        await app.fetch(new Request('http://localhost/api/data'));
      } else {
        await app.fetch(
          new Request('http://localhost/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
            body: JSON.stringify({ id: counter })
          })
        );
      }
      counter++;
    },
    5000,
    { sampleInterval: 250 }
  );

  console.log(
    `Real middleware: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB ` +
    `(growth: ${result.growthMB.toFixed(2)}MB, peak: ${result.peakMB.toFixed(2)}MB)`
  );

  expect(result.growthMB).toBeLessThan(8);
});

test('File upload memory handling (large FormData)', async () => {
  const app = bunserve();

  app.post('/upload', async ({ body }) => {
    const file = body.get?.('file');
    return { uploaded: true, size: file?.size || 0 };
  });

  const result = await measureMemoryGrowth(
    async () => {
      // Create a 100KB file for each upload
      const fileContent = 'x'.repeat(100 * 1024);
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      await app.fetch(
        new Request('http://localhost/upload', {
          method: 'POST',
          body: formData
        })
      );
    },
    1000,
    { sampleInterval: 50 }
  );

  console.log(
    `File uploads: ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB ` +
    `(growth: ${result.growthMB.toFixed(2)}MB, peak: ${result.peakMB.toFixed(2)}MB)`
  );

  // File uploads should clean up properly
  expect(result.growthMB).toBeLessThan(15);
});

test('Memory leak detection in route registration', async () => {
  // Test that registering many routes doesn't leak
  const initialMemory = getMemoryUsage().heapUsed / 1024 / 1024;

  // Create 1000 route registrations
  for (let i = 0; i < 1000; i++) {
    const app = bunserve();
    app.get(`/route${i}`, () => ({ id: i }));

    // Test the route works
    const response = await app.fetch(new Request(`http://localhost/route${i}`));
    expect(response.status).toBe(200);
  }

  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true);
  }
  await new Promise((resolve) => setTimeout(resolve, 200));

  const finalMemory = getMemoryUsage().heapUsed / 1024 / 1024;
  const growthMB = finalMemory - initialMemory;

  console.log(
    `Route registration: ${initialMemory.toFixed(2)}MB -> ${finalMemory.toFixed(2)}MB ` +
    `(growth: ${growthMB.toFixed(2)}MB)`
  );

  // Creating many app instances shouldn't leak significantly
  expect(growthMB).toBeLessThan(20);
});

test('Stress test: Rapid fire requests (20,000 requests)', async () => {
  const app = bunserve();
  app.get('/fast', () => ({ ok: true }));

  const result = await measureMemoryGrowth(
    async () => {
      await app.fetch(new Request('http://localhost/fast'));
    },
    20000, // 20,000 rapid fire requests
    { sampleInterval: 1000, checkLeaks: true }
  );

  console.log(
    `Stress test (20k): ${result.initialMB.toFixed(2)}MB -> ${result.finalMB.toFixed(2)}MB ` +
    `(growth: ${result.growthMB.toFixed(2)}MB, peak: ${result.peakMB.toFixed(2)}MB, ` +
    `${result.gcCount} GCs, ${(result.avgMemoryPerRequest * 1024 * 1024).toFixed(1)}bytes/req)`
  );

  // Should maintain stable memory even under extreme load
  expect(result.growthMB).toBeLessThan(15);
  expect(result.avgMemoryPerRequest).toBeLessThan(0.001);
});
