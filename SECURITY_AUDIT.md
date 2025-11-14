# Security Audit Report

Date: 2025-11-14
Framework: BunServe

## Executive Summary

This security audit identified several vulnerabilities ranging from **MEDIUM** to **LOW** severity. No CRITICAL vulnerabilities were found. The framework implements many security best practices but requires fixes in specific areas.

## Vulnerabilities Found

### 1. Header Injection in CSV Filename (MEDIUM)

**Location**: `src/router.ts:214`

**Issue**: The CSV filename is directly used from `set.content.filename` without sanitization. This allows header injection if the filename contains newlines or other special characters.

```typescript
headers['Content-Disposition'] = `attachment; filename="${set.content.filename}"`;
```

**Impact**: Attackers could inject additional HTTP headers by using filenames with newline characters.

**Recommendation**: Sanitize filename to remove/escape newlines and quotes:
```typescript
const sanitized_filename = set.content.filename
  .replace(/[\r\n]/g, '')
  .replace(/"/g, '\\"');
headers['Content-Disposition'] = `attachment; filename="${sanitized_filename}"`;
```

### 2. Weak Origin Validation in CORS Development Preset (MEDIUM)

**Location**: `src/middleware/cors.ts:37-38`

**Issue**: The development preset uses `.includes()` to check for localhost, which could match malicious domains:

```typescript
origin: (origin: string) =>
  origin.includes('localhost') || origin.includes('127.0.0.1'),
```

**Impact**: Domains like `localhost.evil.com` or `evil-127.0.0.1.com` would be accepted.

**Recommendation**: Use proper URL parsing and exact hostname matching:
```typescript
origin: (origin: string) => {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
```

### 3. Insecure Request ID Generation (LOW)

**Location**: `src/router.ts:29-31`

**Issue**: Uses `Math.random()` for request ID generation, which is not cryptographically secure:

```typescript
return Math.random().toString(36).substring(2) + Date.now().toString(36);
```

**Impact**: Request IDs could potentially be predicted. If used for security purposes (session tokens, CSRF tokens), this would be a CRITICAL issue. For request tracking only, it's LOW severity.

**Recommendation**: If request IDs are only for logging/tracking, this is acceptable. If used for security, use `crypto.randomUUID()`:
```typescript
return crypto.randomUUID();
```

### 4. Open Redirect Potential (MEDIUM)

**Location**: `src/router.ts:167`

**Issue**: Redirect location is not validated:

```typescript
if (set.redirect) {
  return Response.redirect(set.redirect, set.status);
}
```

**Impact**: If user input is directly used in `set.redirect`, attackers could redirect users to malicious sites.

**Recommendation**: While this is the framework's responsibility to provide the API, documentation should warn users to validate redirect URLs. Consider adding an optional validation function:
```typescript
if (set.redirect) {
  // Optional: validate redirect URL is same-origin or allowlisted
  return Response.redirect(set.redirect, set.status);
}
```

### 5. Missing Request Body Size Limits (MEDIUM)

**Location**: `src/router.ts:117-132`

**Issue**: No size limits on request body parsing. Large bodies could cause DoS.

```typescript
if (content_type?.includes('application/json')) {
  body = await request.json().catch(() => null);
}
```

**Impact**: Attackers could send very large payloads to exhaust server memory.

**Recommendation**: Add configurable body size limits. Bun.serve supports `maxRequestBodySize` option - document this prominently.

### 6. CORS Fallback to First Origin (LOW)

**Location**: `src/middleware/cors.ts:121-125`

**Issue**: When origin array doesn't include the request origin, it falls back to the first allowed origin:

```typescript
if (request_origin && origin.includes(request_origin)) {
  allowed_origin = request_origin;
} else {
  allowed_origin = origin[0] || '*';
}
```

**Impact**: Unexpected behavior - requests from disallowed origins still get CORS headers with a different origin.

**Recommendation**: Return no CORS headers or a 403 for disallowed origins:
```typescript
if (request_origin && origin.includes(request_origin)) {
  allowed_origin = request_origin;
} else {
  // Don't set CORS headers for disallowed origins
  return new Response('Forbidden', { status: 403 });
}
```

### 7. Error Information Disclosure (LOW)

**Location**: `src/router.ts:300`

**Issue**: Generic error handling logs full error to console:

```typescript
console.error('Route execution error:', error);
```

**Impact**: In production, this could log sensitive information. However, the response to the user is generic "Internal Server Error", which is correct.

**Recommendation**: Use structured logging and filter sensitive data before logging.

## Security Best Practices Implemented ✅

1. **Generic error messages**: Returns "Internal Server Error" without details (router.ts:301)
2. **Stack traces disabled in production**: Error handler checks NODE_ENV (error-handler.ts:73)
3. **Body parsing error handling**: Uses `.catch(() => null)` to handle malformed JSON gracefully (router.ts:123)
4. **CORS support**: Comprehensive CORS middleware with multiple presets
5. **No eval or Function constructors**: Clean codebase without dangerous dynamic code execution
6. **Type safety**: Full TypeScript implementation reduces type-related vulnerabilities

## Recommendations

### High Priority
1. Fix header injection vulnerability in CSV filename handling
2. Fix CORS development preset origin validation
3. Add body size limit documentation and examples

### Medium Priority
1. Document open redirect risks in redirect feature
2. Add security best practices guide for users
3. Consider adding rate limiting middleware

### Low Priority
1. Consider using crypto.randomUUID() for request IDs if ever used for security
2. Add helmet-style security headers middleware
3. Add input validation utilities

## Security Testing

Added comprehensive security tests in `test/security.test.ts` covering:
- Header injection attempts
- CORS origin validation
- Large payload handling
- XSS prevention
- Path traversal attempts

## Conclusion

BunServe is a well-designed framework with good security fundamentals. The identified vulnerabilities are fixable with minimal code changes. The framework would benefit from:

1. Security documentation for users
2. Built-in rate limiting middleware
3. Input validation utilities
4. Security headers middleware (CSP, X-Frame-Options, etc.)

Overall Security Rating: **B+** (Good, with room for improvement)
