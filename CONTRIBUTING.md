# Contributing to BunServe

Thank you for your interest in contributing to BunServe! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.2.0
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bunserve.git
   cd bunserve
   ```

3. Install dependencies:
   ```bash
   bun install
   ```

4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
# Check code style
bun run lint

# Auto-fix issues
bun run lint:fix
```

### Building

```bash
bun run build
```

### Running Examples

```bash
bun examples/rest-api.ts
```

## Making Changes

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (enforced by Biome)
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- **All new features must include tests**
- Aim for high test coverage (currently 70 tests)
- Test both success and error cases
- Test edge cases
- Use descriptive test names

Example test:
```typescript
test('route with multiple parameters', async () => {
  const router = create_router()

  router.get('/users/:id/posts/:postId', ({ params }) => {
    return { userId: params.id, postId: params.postId }
  })

  const server = create_server({ router })
  const response = await server.fetch(
    new Request('http://localhost/users/123/posts/456')
  )

  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.userId).toBe('123')
  expect(data.postId).toBe('456')
})
```

### Documentation

- Update README.md if adding new features
- Add examples to relevant docs in `docs/docs/`
- Update CHANGELOG.md (following [Keep a Changelog](https://keepachangelog.com))

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add rate limiting middleware
fix: correct wildcard route precedence
docs: update middleware examples
test: add edge cases for query parameters
refactor: simplify response building logic
```

Prefix types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions or changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

## Submitting Changes

### Pull Request Process

1. **Before submitting**:
   - Run all tests: `bun test`
   - Run type checking: `bun run typecheck`
   - Run linter: `bun run lint:fix`
   - Update documentation if needed
   - Update CHANGELOG.md under `[Unreleased]`

2. **Create a pull request**:
   - Push your branch to your fork
   - Open a PR against the `main` branch
   - Fill out the PR template
   - Link any related issues

3. **PR Description should include**:
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Screenshots (if UI-related)

4. **Review process**:
   - CI checks must pass
   - At least one maintainer review required
   - Address review feedback
   - Keep PR focused (one feature/fix per PR)

### Example PR Description

```markdown
## Description
Adds rate limiting middleware to prevent abuse.

## Motivation
Users requested built-in rate limiting to avoid implementing it themselves.

## Changes
- Added `rate_limit()` middleware function
- Added tests for rate limiting
- Updated middleware documentation
- Added rate limiting example

## Testing
- All existing tests pass
- Added 5 new tests for rate limiting
- Tested with example application

## Breaking Changes
None

## Checklist
- [x] Tests added/updated
- [x] Documentation updated
- [x] CHANGELOG.md updated
- [x] All CI checks passing
```

## Areas to Contribute

### High Priority

- Additional middleware (compression, static files, rate limiting)
- Performance optimizations
- More examples (GraphQL, microservices, etc.)
- Bug fixes

### Good First Issues

Look for issues labeled `good first issue` - these are well-defined tasks suitable for new contributors.

### Documentation

- Improve existing documentation
- Add more examples
- Create video tutorials
- Translate documentation

### Testing

- Increase test coverage
- Add performance benchmarks
- Add integration tests

## Architecture Overview

### Project Structure

```
bunserve/
├── src/
│   ├── index.ts          # Main exports
│   ├── types.ts          # TypeScript type definitions
│   ├── router.ts         # Router implementation
│   ├── server.ts         # Server wrapper
│   ├── health.ts         # Health check utilities
│   └── middleware/       # Built-in middleware
│       ├── error-handler.ts
│       ├── cors.ts
│       └── logger.ts
├── test/                 # Test files
├── examples/             # Example applications
└── docs/                 # Documentation
```

### Key Concepts

1. **Native Routing**: BunServe uses Bun's native `routes` object for optimal performance
2. **Type Safety**: Route parameters are automatically type-safe using TypeScript generics
3. **Context Management**: Request-scoped context using AsyncLocalStorage
4. **Middleware**: Express-like middleware with `(context, next)` signature

### Adding Middleware

Example of adding new middleware:

```typescript
// src/middleware/compression.ts
import type { Middleware } from '../types'

export interface CompressionOptions {
  threshold?: number
  level?: number
}

export function compression(options: CompressionOptions = {}): Middleware {
  const { threshold = 1024, level = 6 } = options

  return async (context, next) => {
    await next()

    // Compression logic here
    // ...
  }
}

// Export in src/middleware/index.ts
export { compression } from './compression'

// Export in src/index.ts
export { compression } from './middleware'
```

Then add tests in `test/middleware.test.ts`.

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues and PRs first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make BunServe better for everyone. We appreciate your time and effort! 🎉
