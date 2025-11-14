import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress test configuration - pushes the system to its limits
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 300 }, // Ramp up to 300 users
    { duration: '5m', target: 300 }, // Stay at 300 users
    { duration: '10m', target: 0 } // Ramp down to 0 users
  ]
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/`],
    ['GET', `${BASE_URL}/users/123`],
    [
      'POST',
      `${BASE_URL}/users`,
      JSON.stringify({ name: 'Test', email: 'test@example.com' }),
      { headers: { 'Content-Type': 'application/json' } }
    ]
  ]);

  responses.forEach((res) => {
    check(res, {
      'status is 200': (r) => r.status === 200
    });
  });

  sleep(0.05); // 50ms pause
}
