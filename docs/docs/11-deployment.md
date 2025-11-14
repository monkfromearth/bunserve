# Deployment Guide

Complete guide to deploying BunServe applications to production environments.

## Table of Contents

- [Production Checklist](#production-checklist)
- [Docker Deployment](#docker-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [Railway Deployment](#railway-deployment)
- [DigitalOcean App Platform](#digitalocean-app-platform)
- [Render Deployment](#render-deployment)
- [AWS Deployment](#aws-deployment)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Performance Tuning](#performance-tuning)

## Production Checklist

Before deploying to production, ensure you have:

### Security

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (not the default)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS with specific origins (not `*`)
- [ ] Enable security headers middleware
- [ ] Remove stack traces from error responses
- [ ] Implement rate limiting
- [ ] Validate and sanitize all inputs
- [ ] Use HTTP-only cookies for sensitive data
- [ ] Enable HSTS (Strict-Transport-Security)

### Performance

- [ ] Enable caching for static assets
- [ ] Use database connection pooling
- [ ] Implement pagination for large datasets
- [ ] Add database indexes
- [ ] Enable compression for responses
- [ ] Configure CDN for static files
- [ ] Use production logging (not dev format)

### Reliability

- [ ] Implement graceful shutdown
- [ ] Add health check endpoints (`/health/live`, `/health/ready`)
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure log aggregation
- [ ] Set up automated backups (database)
- [ ] Implement circuit breakers for external APIs
- [ ] Add request timeout limits

### Testing

- [ ] All tests passing (`bun test`)
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Database migrations tested
- [ ] Rollback plan prepared

## Docker Deployment

### Dockerfile

```dockerfile
# Use Bun's official Docker image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production dependencies only
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy source code and build
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Optional: Build TypeScript
ENV NODE_ENV=production
RUN bun run build

# Production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/dist ./dist
COPY --from=prerelease /app/package.json .

# Create non-root user
RUN addgroup --system --gid 1001 bunserve
RUN adduser --system --uid 1001 bunserve
USER bunserve

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health/live').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start the application
ENTRYPOINT ["bun", "run", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=sqlite:///data/app.db
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    volumes:
      - ./data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "bun", "-e", "fetch('http://localhost:3000/health/live')"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Build and Run

```bash
# Build Docker image
docker build -t bunserve-app .

# Run container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret-key \
  --name bunserve-app \
  bunserve-app

# View logs
docker logs -f bunserve-app

# Stop container
docker stop bunserve-app

# Using docker-compose
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Fly.io Deployment

Fly.io provides excellent support for Bun applications with automatic HTTPS and global distribution.

### fly.toml

```toml
app = "my-bunserve-app"
primary_region = "sea"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    timeout = "5s"
    path = "/health/live"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### Deployment Steps

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Initialize Fly app (creates fly.toml)
fly launch

# Set secrets
fly secrets set JWT_SECRET=your-secret-key-here
fly secrets set DATABASE_URL=your-database-url
fly secrets set ALLOWED_ORIGINS=https://yourdomain.com

# Deploy
fly deploy

# Check status
fly status

# View logs
fly logs

# Scale up
fly scale count 2  # Run 2 instances

# Open in browser
fly open
```

### Custom Domain

```bash
# Add custom domain
fly certs add yourdomain.com

# Add www subdomain
fly certs add www.yourdomain.com

# Check certificate status
fly certs show yourdomain.com
```

## Railway Deployment

Railway offers zero-config deployments with automatic HTTPS.

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bun run dist/index.js",
    "healthcheckPath": "/health/live",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Deployment Steps

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project (or create new one)
railway link

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret-key
railway variables set ALLOWED_ORIGINS=https://yourdomain.com

# Deploy
railway up

# View logs
railway logs

# Open in browser
railway open
```

### Using GitHub Integration

1. Connect your GitHub repository to Railway
2. Railway will automatically deploy on every push to main branch
3. Set environment variables in Railway dashboard
4. Configure custom domain in Railway settings

## DigitalOcean App Platform

### .do/app.yaml

```yaml
name: bunserve-app
region: nyc

services:
  - name: api
    dockerfile_path: Dockerfile
    github:
      branch: main
      deploy_on_push: true
      repo: your-username/your-repo

    health_check:
      http_path: /health/live
      initial_delay_seconds: 10
      period_seconds: 30
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3

    http_port: 8080

    instance_count: 1
    instance_size_slug: basic-xxs

    envs:
      - key: NODE_ENV
        value: "production"
      - key: PORT
        value: "8080"
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET

    routes:
      - path: /
```

### Deployment Steps

```bash
# Install doctl CLI
brew install doctl  # macOS
# or download from: https://docs.digitalocean.com/reference/doctl/

# Authenticate
doctl auth init

# Create app
doctl apps create --spec .do/app.yaml

# Get app ID
doctl apps list

# View logs
doctl apps logs <app-id> --type run

# Update app
doctl apps update <app-id> --spec .do/app.yaml
```

## Render Deployment

Render provides automatic deployments from Git with zero configuration.

### render.yaml

```yaml
services:
  - type: web
    name: bunserve-app
    env: docker
    plan: starter
    region: oregon

    healthCheckPath: /health/live

    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: bunserve-db
          property: connectionString
      - key: ALLOWED_ORIGINS
        sync: false

databases:
  - name: bunserve-db
    plan: starter
    databaseName: bunserve
    user: bunserve
```

### Deployment Steps

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Select "Docker" as environment
4. Set environment variables in Render dashboard
5. Render will automatically deploy on every push

## AWS Deployment

### Using AWS Elastic Beanstalk

#### Dockerrun.aws.json

```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "your-dockerhub-username/bunserve-app:latest",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": 3000,
      "HostPort": 80
    }
  ],
  "Volumes": [],
  "Logging": "/var/log/bunserve"
}
```

### Using AWS ECS (Fargate)

```bash
# Build and push Docker image to ECR
aws ecr create-repository --repository-name bunserve-app

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
docker build -t bunserve-app .
docker tag bunserve-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/bunserve-app:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/bunserve-app:latest

# Create ECS task definition and service via AWS Console or CLI
```

## Environment Variables

### Production Environment Variables

```bash
# Required
NODE_ENV=production
PORT=3000
JWT_SECRET=your-very-long-random-secret-key-here

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
# or for SQLite
DATABASE_URL=sqlite:///data/app.db

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging
LOG_LEVEL=info

# Optional
SENTRY_DSN=https://your-sentry-dsn
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Feature flags
ENABLE_DEBUG=false
ENABLE_METRICS=true
```

### Loading Environment Variables

```typescript
// src/config/env.ts

export const config = {
  env: process.env.NODE_ENV || 'development',
  is_production: process.env.NODE_ENV === 'production',

  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',

  database_url: process.env.DATABASE_URL || 'sqlite://app.db',

  jwt_secret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-secret';
  })(),

  allowed_origins: process.env.ALLOWED_ORIGINS?.split(',') || [],

  sentry_dsn: process.env.SENTRY_DSN,

  log_level: process.env.LOG_LEVEL || 'info'
};

// Validate required variables
if (config.is_production) {
  const required = ['JWT_SECRET', 'DATABASE_URL', 'ALLOWED_ORIGINS'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

## Health Checks

Implement comprehensive health checks for production monitoring:

```typescript
import { bunserve } from 'bunserve';
import { Database } from 'bun:sqlite';

const app = bunserve();

// Liveness probe - is the app running?
app.get('/health/live', () => ({
  status: 'alive',
  timestamp: new Date().toISOString()
}));

// Readiness probe - can the app handle requests?
app.get('/health/ready', async () => {
  const checks = {
    database: false,
    memory: false
  };

  // Check database connection
  try {
    const db = get_database();
    db.query('SELECT 1').get();
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check memory usage
  const mem = process.memoryUsage();
  checks.memory = mem.heapUsed < mem.heapTotal * 0.9;

  const is_ready = Object.values(checks).every(check => check === true);

  return {
    status: is_ready ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Full health check with detailed metrics
app.get('/health', async () => {
  const mem = process.memoryUsage();

  return {
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heap_used: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heap_total: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`
    },
    environment: process.env.NODE_ENV
  };
});
```

## Monitoring

### Error Monitoring with Sentry

```typescript
// src/monitoring/sentry.ts
import * as Sentry from '@sentry/bun';
import { config } from '../config/env';

export function init_sentry() {
  if (config.sentry_dsn) {
    Sentry.init({
      dsn: config.sentry_dsn,
      environment: config.env,
      tracesSampleRate: config.is_production ? 0.1 : 1.0
    });
  }
}

// src/index.ts
import { init_sentry } from './monitoring/sentry';

init_sentry();

// Use in error handler
app.use(error_handler({
  log_error: (error, context) => {
    Sentry.captureException(error, {
      contexts: {
        request: {
          url: context.request.url,
          method: context.request.method
        }
      }
    });
  }
}));
```

### Application Metrics

```typescript
// src/middleware/metrics.ts

const metrics = {
  requests_total: 0,
  requests_by_status: new Map<number, number>(),
  response_times: [] as number[]
};

export const metrics_middleware = async ({ request, set }, next) => {
  const start = Date.now();

  metrics.requests_total++;

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    metrics.response_times.push(duration);

    const status = set.status || 200;
    metrics.requests_by_status.set(
      status,
      (metrics.requests_by_status.get(status) || 0) + 1
    );
  }
};

// Metrics endpoint
app.get('/metrics', () => ({
  total_requests: metrics.requests_total,
  by_status: Object.fromEntries(metrics.requests_by_status),
  avg_response_time:
    metrics.response_times.reduce((a, b) => a + b, 0) / metrics.response_times.length,
  uptime: process.uptime()
}));
```

## Performance Tuning

### Enable Bun's JIT Compiler

```typescript
// Start with Bun's optimizations
// Use --smol for smaller memory footprint
// bun --smol run src/index.ts

// Or for maximum performance
// bun --jsc run src/index.ts
```

### Database Optimization

```typescript
// Enable SQLite optimizations
const db = new Database(config.database_url);

// WAL mode for better concurrency
db.exec('PRAGMA journal_mode = WAL');

// Faster synchronization
db.exec('PRAGMA synchronous = NORMAL');

// Increase cache size
db.exec('PRAGMA cache_size = 10000');

// Use memory for temp storage
db.exec('PRAGMA temp_store = memory');

// Prepare statements for reuse
const get_user_stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const users = get_user_stmt.all(user_id);
```

### Response Compression

```typescript
// Enable compression for large responses
import { gzipSync } from 'node:zlib';

app.use(async ({ request, set }, next) => {
  await next();

  const accept_encoding = request.headers.get('accept-encoding') || '';

  if (accept_encoding.includes('gzip')) {
    // Only compress responses > 1KB
    // Compression middleware would go here
  }
});
```

## Graceful Shutdown

Handle shutdown signals properly:

```typescript
// src/index.ts

const app = bunserve();
const server = app.listen(config.port);

let is_shutting_down = false;

async function shutdown(signal: string) {
  if (is_shutting_down) return;
  is_shutting_down = true;

  console.log(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  await server.close();

  // Close database connections
  await close_database();

  // Close other resources (Redis, etc.)

  console.log('Graceful shutdown complete');
  process.exit(0);
}

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  shutdown('unhandledRejection');
});
```

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx

```nginx
# /etc/nginx/sites-available/bunserve

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Next Steps

- **[Best Practices](./10-best-practices.md)** - Production best practices
- **[File Uploads](./12-file-uploads.md)** - Handle file uploads securely
- **[Migration Guide](./13-migration.md)** - Migrate from Express or Elysia
- **[API Reference](./08-api-reference.md)** - Complete API documentation
