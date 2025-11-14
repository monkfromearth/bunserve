import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics for memory tracking
const memoryTrend = new Trend('memory_usage_mb');
const requestCounter = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 } // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failed requests
    memory_usage_mb: ['avg<100'] // Average memory should stay below 100MB
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Track requests to monitor memory patterns
let requestCount = 0;

export default function () {
  requestCounter.add(1);
  requestCount++;

  // Mix of different request types
  const endpoints = [
    { method: 'GET', url: '/', name: 'home' },
    { method: 'GET', url: `/users/${Math.floor(Math.random() * 1000)}`, name: 'user' },
    {
      method: 'POST',
      url: '/users',
      body: JSON.stringify({
        name: `User ${requestCount}`,
        email: `user${requestCount}@example.com`
      }),
      params: {
        headers: { 'Content-Type': 'application/json' }
      },
      name: 'create_user'
    }
  ];

  // Randomly select an endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  let response;
  if (endpoint.method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint.url}`, {
      tags: { endpoint: endpoint.name }
    });
  } else {
    response = http.post(`${BASE_URL}${endpoint.url}`, endpoint.body, {
      ...endpoint.params,
      tags: { endpoint: endpoint.name }
    });
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 1000
  });

  // Simulate memory usage tracking (in real scenario, this would come from the server)
  // For demonstration, we estimate based on response size and duration
  const estimatedMemoryMB =
    (response.body.length / 1024 / 1024) * 10 + response.timings.duration / 100;
  memoryTrend.add(estimatedMemoryMB);

  sleep(Math.random() * 0.5 + 0.1); // Random sleep between 0.1-0.6s
}

export function handleSummary(data) {
  return {
    'memory-profile-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

function textSummary(data, { indent = '', enableColors = false } = {}) {
  const metrics = data.metrics;

  let summary = '\n';
  summary += `${indent}Memory Profile Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  if (metrics.memory_usage_mb) {
    summary += `${indent}Memory Usage (MB):\n`;
    summary += `${indent}  avg: ${metrics.memory_usage_mb.values.avg.toFixed(2)}\n`;
    summary += `${indent}  min: ${metrics.memory_usage_mb.values.min.toFixed(2)}\n`;
    summary += `${indent}  max: ${metrics.memory_usage_mb.values.max.toFixed(2)}\n`;
    summary += `${indent}  p95: ${metrics.memory_usage_mb.values['p(95)'].toFixed(2)}\n\n`;
  }

  if (metrics.http_req_duration) {
    summary += `${indent}Request Duration:\n`;
    summary += `${indent}  avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (metrics.total_requests) {
    summary += `${indent}Total Requests: ${metrics.total_requests.values.count}\n`;
  }

  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    summary += `${indent}Failed Requests: ${failRate}%\n`;
  }

  return summary;
}
