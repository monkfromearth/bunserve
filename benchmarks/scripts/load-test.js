import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50 users
    { duration: '30s', target: 50 }, // Stay at 50 users
    { duration: '10s', target: 100 }, // Ramp up to 100 users
    { duration: '30s', target: 100 }, // Stay at 100 users
    { duration: '10s', target: 0 } // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.01'] // Error rate should be less than 1%
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test 1: GET /
  const res1 = http.get(`${BASE_URL}/`);
  check(res1, {
    'GET / status is 200': (r) => r.status === 200,
    'GET / has message': (r) => JSON.parse(r.body).message === 'Hello World'
  });

  // Test 2: GET /users/:id
  const res2 = http.get(`${BASE_URL}/users/123`);
  check(res2, {
    'GET /users/:id status is 200': (r) => r.status === 200,
    'GET /users/:id has id': (r) => JSON.parse(r.body).id === '123'
  });

  // Test 3: POST /users
  const payload = JSON.stringify({
    name: 'Test User',
    email: 'test@example.com'
  });
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const res3 = http.post(`${BASE_URL}/users`, payload, params);
  check(res3, {
    'POST /users status is 200': (r) => r.status === 200,
    'POST /users success': (r) => JSON.parse(r.body).success === true
  });

  sleep(0.1); // 100ms pause between iterations
}
