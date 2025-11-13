# Changelog

All notable changes to BunServe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-13

### Added
- Initial release of BunServe
- Express-like routing API (`router.get()`, `router.post()`, etc.)
- Type-safe route parameters with automatic type inference
- Wildcard routes support (`/api/*`)
- All HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD, ALL)
- Built on Bun's native routing for <5% overhead
- Native cookie support using Bun's CookieMap API
- Request-scoped context management using AsyncLocalStorage
- Global and route-specific middleware chains
- Built-in middleware:
  - `error_handler` - Structured error handling with HttpError class
  - `cors` - CORS support with flexible origin validation
  - `logger` - Request logging with multiple formats
- Health check utilities (`create_health_check`, `simple_health_check`)
- HttpError class with factory methods:
  - `HttpError.bad_request()`
  - `HttpError.unauthorized()`
  - `HttpError.forbidden()`
  - `HttpError.not_found()`
  - `HttpError.conflict()`
  - `HttpError.internal()`
- Response helpers:
  - Auto content-type detection
  - JSON, text, HTML, XML responses
  - Image responses (PNG, SVG, GIF, WebP)
  - CSV file downloads with custom filenames
  - Cache-Control header support
  - Custom headers
  - Redirects
- Query parameter parsing
- Request body parsing (JSON, form data, multipart)
- Server lifecycle methods:
  - `server.listen()`
  - `server.close()`
  - `server.fetch()` (for testing)
  - `server.get_bun_server()`
- Comprehensive documentation (8 files, 3,000+ lines)
- 70 tests with full test coverage
- TypeScript type definitions
- Example REST API application

### Performance
- <5% overhead compared to raw `Bun.serve()`
- Zero custom route matching (uses Bun's native routing)
- Efficient cookie handling with native CookieMap
- Request-scoped context using AsyncLocalStorage

[unreleased]: https://github.com/monkfromearth/bunserve/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/monkfromearth/bunserve/releases/tag/v0.1.0
