import { expect, test } from 'bun:test';
import { bunserve, security } from '../src';

test('security() adds default security headers', async () => {
  const app = bunserve();

  app.use(security());
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.status).toBe(200);

  // Check security headers are set
  expect(response.headers.get('Content-Security-Policy')).toBeDefined();
  expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  expect(response.headers.get('Permissions-Policy')).toBeDefined();
  expect(response.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none');
});

test('security() with custom CSP directives', async () => {
  const app = bunserve();

  app.use(
    security({
      content_security_policy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", 'https://fonts.googleapis.com']
        }
      }
    })
  );
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  const csp = response.headers.get('Content-Security-Policy');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).toContain('style-src');
  expect(csp).toContain('https://fonts.googleapis.com');
});

test('security() can disable specific headers', async () => {
  const app = bunserve();

  app.use(
    security({
      content_security_policy: false,
      strict_transport_security: false
    })
  );
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.headers.get('Content-Security-Policy')).toBeNull();
  expect(response.headers.get('Strict-Transport-Security')).toBeNull();
  // But other headers should still be present
  expect(response.headers.get('X-Frame-Options')).toBe('DENY');
});

test('security() with custom frame options', async () => {
  const app = bunserve();

  app.use(
    security({
      frame_options: 'SAMEORIGIN'
    })
  );
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
});

test('security() with custom HSTS configuration', async () => {
  const app = bunserve();

  app.use(
    security({
      strict_transport_security: {
        max_age: 86400, // 1 day
        include_sub_domains: false,
        preload: true
      }
    })
  );
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  const hsts = response.headers.get('Strict-Transport-Security');
  expect(hsts).toBe('max-age=86400; preload');
  expect(hsts).not.toContain('includeSubDomains');
});

test('security() removes X-Powered-By header', async () => {
  const app = bunserve();

  app.use(security());
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.headers.get('X-Powered-By')).toBeNull();
});

test('security() can be disabled entirely', async () => {
  const app = bunserve();

  app.use(security({ enabled: false }));
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.status).toBe(200);
  // No security headers should be added when disabled
  expect(response.headers.get('X-Frame-Options')).toBeNull();
});

test('security() with custom permissions policy', async () => {
  const app = bunserve();

  app.use(
    security({
      permissions_policy: {
        camera: ['self'],
        microphone: [],
        geolocation: ['self', 'https://example.com']
      }
    })
  );
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  const policy = response.headers.get('Permissions-Policy');
  expect(policy).toContain('camera=(self)');
  expect(policy).toContain('microphone=()');
  expect(policy).toContain('geolocation=(self https://example.com)');
});

test('security() with custom referrer policy', async () => {
  const app = bunserve();

  app.use(
    security({
      referrer_policy: 'strict-origin-when-cross-origin'
    })
  );
  app.get('/test', () => ({ success: true }));

  const response = await app.fetch(new Request('http://localhost/test'));

  expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
});
