import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    small_file: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      tags: { test_type: 'small_file' }
    },
    medium_file: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '35s',
      tags: { test_type: 'medium_file' }
    },
    large_file: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      startTime: '70s',
      tags: { test_type: 'large_file' }
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.01'] // Less than 1% failed requests
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const scenario = __EXEC.scenario.name;
  let fileSize;
  let fileName;

  // Determine file size based on scenario
  switch (scenario) {
    case 'small_file':
      fileSize = 1024; // 1 KB
      fileName = 'small.txt';
      break;
    case 'medium_file':
      fileSize = 1024 * 100; // 100 KB
      fileName = 'medium.txt';
      break;
    case 'large_file':
      fileSize = 1024 * 1024; // 1 MB
      fileName = 'large.txt';
      break;
    default:
      fileSize = 1024;
      fileName = 'default.txt';
  }

  // Create file content
  const fileContent = 'x'.repeat(fileSize);

  // Create multipart form data
  const formData = {
    file: http.file(fileContent, fileName, 'text/plain'),
    name: `upload-${scenario}`
  };

  const response = http.post(`${BASE_URL}/upload`, formData, {
    tags: { scenario }
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has success': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
    'file size matches': (r) => {
      const body = JSON.parse(r.body);
      return body.fileSize === fileSize;
    }
  });

  sleep(0.1);
}
