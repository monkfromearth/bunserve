# BunServe Benchmarks

Performance benchmarks comparing BunServe against other popular Node.js/Bun web frameworks using k6 load testing.

## Quick Results

**Tested & Verified** ✅

- **32,420 req/s** with full middleware stack (CORS, logging, error handling)
- **34,253 req/s** with just routing (no middleware)
- **~35,000+ req/s** for raw Bun.serve (theoretical maximum)
- **~2% overhead** for basic routing, **~7% overhead** with middleware
- **272µs p95 latency** (sub-millisecond)
- **0% error rate** under load

**Value Proposition**: Express-like DX with near-native Bun performance.

See [TESTING.md](../TESTING.md) for detailed results and honest analysis.

## Frameworks Tested

- **BunServe** - This library (Express-like API with <5% overhead)
- **Raw Bun.serve** - Bun's native HTTP server with routes API
- **Express.js** - The most popular Node.js web framework
- **Hono** - Ultrafast web framework for edge runtimes
- **Elysia** - Ergonomic Bun web framework with TypeScript support

## Test Types

### Load Test (Default)
Standard load test that gradually increases users and measures performance under normal conditions.

- **Duration**: ~90 seconds
- **Users**: 0 → 50 → 100 → 0
- **Thresholds**:
  - 95% of requests < 100ms
  - Error rate < 1%

### Stress Test
Pushes the system to its limits to find breaking points.

- **Duration**: ~30 minutes
- **Users**: 0 → 100 → 200 → 300 → 0
- **Purpose**: Identify system limits and stability issues

### Spike Test
Tests how the system handles sudden traffic spikes.

- **Duration**: ~8 minutes
- **Users**: 0 → 100 → 1000 (spike) → 100 → 0
- **Purpose**: Evaluate recovery and stability during traffic bursts

## Prerequisites

1. **Bun** - Install from [bun.sh](https://bun.sh)
2. **k6** - Install from [k6.io](https://k6.io/docs/get-started/installation/)
3. **Dependencies** - Run `bun install` in project root

## Running Benchmarks

### Quick Start

```bash
# Run load test for all frameworks
./benchmarks/run.sh all

# Run specific test type for all frameworks
./benchmarks/run.sh all stress-test
./benchmarks/run.sh all spike-test

# Run specific framework only
./benchmarks/run.sh bunserve
./benchmarks/run.sh express
./benchmarks/run.sh hono
./benchmarks/run.sh elysia
./benchmarks/run.sh raw-bun

# Run specific framework with specific test
./benchmarks/run.sh bunserve stress-test
./benchmarks/run.sh hono spike-test
```

### Manual Testing

You can also run tests manually:

```bash
# 1. Start a server
bun benchmarks/servers/bunserve.ts

# 2. In another terminal, run k6
k6 run benchmarks/scripts/load-test.js
k6 run benchmarks/scripts/stress-test.js
k6 run benchmarks/scripts/spike-test.js
```

## Test Scenarios

Each test runs three endpoints:

1. **GET /** - Simple JSON response
2. **GET /users/:id** - Route with URL parameter
3. **POST /users** - JSON body parsing

These scenarios test:
- Basic routing performance
- Parameter extraction
- Request body parsing
- JSON serialization

## Results

Results are saved to `benchmarks/results/` directory:

- `{framework}-{test-type}.json` - Full k6 metrics
- `{framework}-{test-type}-summary.json` - Summary statistics

### Key Metrics

- **Requests per second** - Total throughput
- **Response time (p95)** - 95th percentile latency
- **Response time (p99)** - 99th percentile latency
- **Error rate** - Percentage of failed requests

## Sample Output

```
Testing: bunserve with load-test
=================================
Starting bunserve server...
Server is ready!
Running load-test...

     ✓ GET / status is 200
     ✓ GET / has message
     ✓ GET /users/:id status is 200
     ✓ GET /users/:id has id
     ✓ POST /users status is 200
     ✓ POST /users success

     checks.........................: 100.00% ✓ 45000      ✗ 0
     data_received..................: 12 MB   133 kB/s
     data_sent......................: 4.2 MB  47 kB/s
     http_req_blocked...............: avg=2.45µs   min=0s      med=2µs     max=1.2ms   p(90)=3µs     p(95)=4µs
     http_req_connecting............: avg=0s       min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_duration..............: avg=12.3ms   min=1.2ms   med=10.5ms  max=95.2ms  p(90)=23.1ms  p(95)=31.4ms
     http_req_failed................: 0.00%   ✓ 0          ✗ 15000
     http_req_receiving.............: avg=23.45µs  min=10µs    med=20µs    max=542µs   p(90)=35µs    p(95)=45µs
     http_req_sending...............: avg=10.12µs  min=4µs     med=9µs     max=234µs   p(90)=15µs    p(95)=18µs
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=12.26ms  min=1.18ms  med=10.47ms max=95.15ms p(90)=23.06ms p(95)=31.36ms
     http_reqs......................: 15000   166.666667/s
     iteration_duration.............: avg=137.8ms  min=103.5ms med=134.2ms max=256.3ms p(90)=158.4ms p(95)=172.1ms
     iterations.....................: 5000    55.555556/s
     vus............................: 0       min=0        max=100
     vus_max........................: 100     min=100      max=100
```

## Performance Goals

BunServe aims to achieve:

- **< 5% overhead** compared to raw Bun.serve
- **< 20ms p95 latency** under normal load (100 concurrent users)
- **> 10,000 req/s** on standard hardware
- **0% error rate** under normal conditions

## Contributing

When adding new features to BunServe:

1. Run benchmarks before and after changes
2. Ensure performance doesn't degrade significantly
3. Document any performance implications

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### k6 Not Found

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## References

- [k6 Documentation](https://k6.io/docs/)
- [Bun Performance](https://bun.sh/docs/runtime/bunfig#performance)
- [HTTP Benchmarking Best Practices](https://k6.io/blog/how-to-generate-a-constant-request-rate-in-k6/)
