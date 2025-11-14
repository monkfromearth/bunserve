import http from 'k6/http';
import { check } from 'k6';

// Spike test - sudden bursts of traffic
export const options = {
  stages: [
    { duration: '10s', target: 100 }, // Fast ramp up
    { duration: '1m', target: 100 }, // Stay at 100
    { duration: '10s', target: 1000 }, // Spike to 1000 users
    { duration: '3m', target: 1000 }, // Stay at 1000
    { duration: '10s', target: 100 }, // Drop back to 100
    { duration: '3m', target: 100 }, // Stay at 100
    { duration: '10s', target: 0 } // Ramp down
  ]
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'status is 200': (r) => r.status === 200
  });
}
