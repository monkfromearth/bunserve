/**
 * 06. Health Checks Example
 *
 * This example demonstrates health check endpoints for monitoring:
 * - Liveness probe (is the server running?)
 * - Readiness probe (is the server ready to handle requests?)
 * - Detailed health status with dependencies
 *
 * Run: bun 06-health-checks.ts
 */

import { bunserve } from '../src/index';

const app = bunserve();

const start_time = Date.now();

// Simple liveness check - is the server alive?
app.get('/health', () => {
  return {
    status: 'healthy',
    uptime: Math.floor((Date.now() - start_time) / 1000)
  };
});

// Readiness check - is the server ready to accept traffic?
app.get('/ready', () => {
  // Check if critical dependencies are available
  const is_ready = true; // Add real checks here

  if (!is_ready) {
    const error: any = new Error('Service not ready');
    error.status = 503;
    throw error;
  }

  return {
    status: 'ready',
    timestamp: new Date()
  };
});

// Detailed health check with dependency status
app.get('/health/detailed', () => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: Math.floor((Date.now() - start_time) / 1000),
    version: '1.0.0',
    dependencies: {
      database: check_database(),
      cache: check_cache(),
      external_api: check_external_api()
    }
  };

  // Determine overall status
  const all_healthy = Object.values(health.dependencies).every(d => d.status === 'healthy');
  health.status = all_healthy ? 'healthy' : 'degraded';

  return health;
});

// Mock dependency checks
function check_database() {
  return {
    status: 'healthy',
    response_time: 5
  };
}

function check_cache() {
  return {
    status: 'healthy',
    response_time: 2
  };
}

function check_external_api() {
  return {
    status: 'healthy',
    response_time: 150
  };
}

// Metrics endpoint
app.get('/metrics', () => {
  return {
    requests_total: 1234,
    requests_per_second: 42,
    average_response_time: 15.5,
    error_rate: 0.01,
    memory_usage: process.memoryUsage()
  };
});

// Start server
console.log('Starting health checks server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log('');
console.log('Health check endpoints:');
console.log('  GET /health           - Simple liveness check');
console.log('  GET /ready            - Readiness probe');
console.log('  GET /health/detailed  - Detailed health with dependencies');
console.log('  GET /metrics          - Application metrics');
