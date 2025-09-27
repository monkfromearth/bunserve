# Development Guide

## Setting Up Development Environment

### Prerequisites
- Bun installed on your system
- TypeScript (included with Bun)
- Git

### Clone and Setup
```bash
git clone <repository-url>
cd bunserve
bun install
```

### Project Structure
```
bunserve/
├── src/
│   ├── index.ts          # Main entry point
│   ├── bunserve.ts       # Core BunServe class
│   ├── router.ts         # Route handling
│   ├── middleware.ts     # Middleware system
│   ├── context.ts        # Context system
│   ├── validation.ts     # Schema validation
│   └── types.ts          # TypeScript types
├── test/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                 # Documentation
├── examples/             # Example applications
└── package.json
```

## Development Commands

### Testing
```bash
# Run all tests
bun test

# Run specific test file
bun test test/unit/router.test.ts

# Watch mode for development
bun test --watch
```

### Building
```bash
# Build the library
bun run build

# Build with type checking
bun run build:types
```

### Development Server
```bash
# Start development server with examples
bun run dev

# Start with hot reload
bun --hot src/index.ts
```

## Code Style and Conventions

### TypeScript Guidelines
- Use strict TypeScript configuration
- Prefer interface over type for object definitions
- Use generic types for maximum type safety
- Document all public APIs with JSDoc

### Code Organization
- Each feature in its own file
- Export types from dedicated types file
- Use consistent naming conventions
- Follow single responsibility principle

### Testing Guidelines
- Test all public APIs
- Use descriptive test names
- Mock external dependencies
- Include both positive and negative test cases

## Contributing

### Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run test suite
5. Submit pull request

### Pull Request Process
- Update documentation for new features
- Add tests for new functionality
- Ensure all tests pass
- Update version if necessary

## Debugging

### Debug Mode
```typescript
const app = new BunServe({
  debug: true
})
```

### Logging
```typescript
// Enable request logging
app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`)
  await next()
})
```

### Development Tools
- Bun's built-in debugger
- VS Code TypeScript integration
- Browser DevTools for frontend debugging

## Performance Profiling

### Benchmarking
```bash
# Run benchmarks
bun run benchmark

# Profile memory usage
bun run profile:memory
```

### Performance Tips
- Use Bun's built-in performance tools
- Profile routes with high traffic
- Monitor memory usage
- Optimize middleware chains

## Documentation Development

### API Documentation
- Document all public methods
- Include type information
- Provide usage examples
- Link to related concepts

### Guide Development
- Write step-by-step tutorials
- Include code examples
- Explain concepts clearly
- Add troubleshooting sections

## Release Process

### Version Management
- Follow semantic versioning
- Update changelog for each release
- Tag releases in Git
- Publish to npm registry

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version numbers updated
- [ ] Changelog updated
- [ ] Build artifacts created