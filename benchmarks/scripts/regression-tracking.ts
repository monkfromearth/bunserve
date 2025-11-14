#!/usr/bin/env bun

/**
 * Performance regression tracking script
 *
 * This script runs performance tests and compares results against historical baselines.
 * Use this in CI to detect performance regressions.
 *
 * Usage:
 *   bun benchmarks/scripts/regression-tracking.ts [--save-baseline]
 */

import { bunserve } from '../../src';
import { existsSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  name: string;
  avgMs: number;
  p95Ms: number;
  reqPerSec: number;
}

interface BaselineData {
  date: string;
  commit?: string;
  results: BenchmarkResult[];
}

const BASELINE_FILE = join(import.meta.dir, '../data/performance-baseline.json');

async function measurePerformance(
  fn: () => Promise<void>,
  iterations: number = 1000
): Promise<{ avgMs: number; p95Ms: number; reqPerSec: number }> {
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
  const p95Index = Math.floor(timings.length * 0.95);
  const p95Ms = timings[p95Index];
  const reqPerSec = (iterations / totalTime) * 1000;

  return { avgMs, p95Ms, reqPerSec };
}

async function runBenchmarks(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  console.log('Running performance benchmarks...\n');

  // 1. Simple GET
  {
    const app = bunserve();
    app.get('/test', () => ({ message: 'test' }));

    const result = await measurePerformance(
      async () => {
        await app.fetch(new Request('http://localhost/test'));
      },
      1000
    );

    results.push({
      name: 'Simple GET',
      ...result
    });

    console.log(
      `✓ Simple GET: ${result.avgMs.toFixed(3)}ms avg, ${result.reqPerSec.toFixed(0)} req/s`
    );
  }

  // 2. Route with parameters
  {
    const app = bunserve();
    app.get('/users/:id', ({ params }) => ({ id: params.id }));

    let counter = 0;
    const result = await measurePerformance(
      async () => {
        await app.fetch(new Request(`http://localhost/users/${counter++}`));
      },
      1000
    );

    results.push({
      name: 'Route with parameters',
      ...result
    });

    console.log(
      `✓ Route params: ${result.avgMs.toFixed(3)}ms avg, ${result.reqPerSec.toFixed(0)} req/s`
    );
  }

  // 3. JSON body parsing
  {
    const app = bunserve();
    app.post('/data', ({ body }) => ({ received: true, data: body }));

    const testData = { name: 'Test', email: 'test@example.com' };

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

    results.push({
      name: 'JSON body parsing',
      ...result
    });

    console.log(
      `✓ JSON parsing: ${result.avgMs.toFixed(3)}ms avg, ${result.reqPerSec.toFixed(0)} req/s`
    );
  }

  // 4. Middleware overhead
  {
    const app = bunserve();
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

    results.push({
      name: 'Middleware (3x)',
      ...result
    });

    console.log(
      `✓ Middleware: ${result.avgMs.toFixed(3)}ms avg, ${result.reqPerSec.toFixed(0)} req/s`
    );
  }

  return results;
}

async function loadBaseline(): Promise<BaselineData | null> {
  if (!existsSync(BASELINE_FILE)) {
    return null;
  }

  try {
    const data = Bun.file(BASELINE_FILE);
    return await data.json();
  } catch (error) {
    console.error('Error loading baseline:', error);
    return null;
  }
}

async function saveBaseline(results: BenchmarkResult[]): Promise<void> {
  const baseline: BaselineData = {
    date: new Date().toISOString(),
    commit: process.env.GIT_COMMIT,
    results
  };

  // Create directory if it doesn't exist
  const dir = join(import.meta.dir, '../data');
  if (!existsSync(dir)) {
    await Bun.$`mkdir -p ${dir}`;
  }

  await Bun.write(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log(`\n✓ Baseline saved to ${BASELINE_FILE}`);
}

function compareResults(current: BenchmarkResult[], baseline: BenchmarkResult[]): {
  regressions: string[];
  improvements: string[];
} {
  const regressions: string[] = [];
  const improvements: string[] = [];

  const THRESHOLD = 0.1; // 10% regression threshold

  for (const currentResult of current) {
    const baselineResult = baseline.find((r) => r.name === currentResult.name);
    if (!baselineResult) continue;

    // Compare average response time
    const avgChange = (currentResult.avgMs - baselineResult.avgMs) / baselineResult.avgMs;
    const throughputChange =
      (currentResult.reqPerSec - baselineResult.reqPerSec) / baselineResult.reqPerSec;

    if (avgChange > THRESHOLD) {
      regressions.push(
        `${currentResult.name}: avg latency increased by ${(avgChange * 100).toFixed(1)}% (${baselineResult.avgMs.toFixed(3)}ms → ${currentResult.avgMs.toFixed(3)}ms)`
      );
    } else if (avgChange < -THRESHOLD) {
      improvements.push(
        `${currentResult.name}: avg latency decreased by ${(-avgChange * 100).toFixed(1)}% (${baselineResult.avgMs.toFixed(3)}ms → ${currentResult.avgMs.toFixed(3)}ms)`
      );
    }

    if (throughputChange < -THRESHOLD) {
      regressions.push(
        `${currentResult.name}: throughput decreased by ${(-throughputChange * 100).toFixed(1)}% (${baselineResult.reqPerSec.toFixed(0)} → ${currentResult.reqPerSec.toFixed(0)} req/s)`
      );
    } else if (throughputChange > THRESHOLD) {
      improvements.push(
        `${currentResult.name}: throughput increased by ${(throughputChange * 100).toFixed(1)}% (${baselineResult.reqPerSec.toFixed(0)} → ${currentResult.reqPerSec.toFixed(0)} req/s)`
      );
    }
  }

  return { regressions, improvements };
}

async function main() {
  const args = process.argv.slice(2);
  const saveBaselineFlag = args.includes('--save-baseline');

  const results = await runBenchmarks();

  if (saveBaselineFlag) {
    await saveBaseline(results);
    return;
  }

  const baseline = await loadBaseline();

  if (!baseline) {
    console.log('\n⚠️  No baseline found. Run with --save-baseline to create one.');
    console.log('\nCurrent results:');
    for (const result of results) {
      console.log(
        `  ${result.name}: ${result.avgMs.toFixed(3)}ms avg, ${result.reqPerSec.toFixed(0)} req/s`
      );
    }
    return;
  }

  console.log(`\nComparing against baseline from ${new Date(baseline.date).toLocaleString()}`);

  const { regressions, improvements } = compareResults(results, baseline.results);

  if (regressions.length > 0) {
    console.log('\n⚠️  Performance Regressions Detected:');
    for (const regression of regressions) {
      console.log(`  ❌ ${regression}`);
    }
  }

  if (improvements.length > 0) {
    console.log('\n✨ Performance Improvements:');
    for (const improvement of improvements) {
      console.log(`  ✓ ${improvement}`);
    }
  }

  if (regressions.length === 0 && improvements.length === 0) {
    console.log('\n✓ No significant performance changes detected.');
  }

  // Exit with error code if regressions detected
  if (regressions.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
