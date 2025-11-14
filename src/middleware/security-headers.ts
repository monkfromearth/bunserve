import type { Middleware } from '../types';

/**
 * Security headers middleware configuration options.
 */
export interface SecurityHeadersOptions {
  /** Enable all security headers (default: true) */
  enabled?: boolean;

  /** Content Security Policy (default: strict policy) */
  content_security_policy?:
    | false
    | {
        directives?: Record<string, string | string[]>;
      };

  /** X-Frame-Options (default: 'DENY') */
  frame_options?: false | 'DENY' | 'SAMEORIGIN';

  /** X-Content-Type-Options (default: 'nosniff') */
  content_type_options?: false | 'nosniff';

  /** X-XSS-Protection (default: '1; mode=block') */
  xss_protection?: false | '0' | '1' | '1; mode=block';

  /** Strict-Transport-Security (default: enabled with 1 year) */
  strict_transport_security?:
    | false
    | {
        max_age?: number;
        include_sub_domains?: boolean;
        preload?: boolean;
      };

  /** Referrer-Policy (default: 'no-referrer') */
  referrer_policy?:
    | false
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

  /** Permissions-Policy (default: restrictive policy) */
  permissions_policy?: false | Record<string, string[]>;

  /** X-Permitted-Cross-Domain-Policies (default: 'none') */
  cross_domain_policy?: false | 'none' | 'master-only' | 'by-content-type' | 'all';

  /** Remove X-Powered-By header (default: true) */
  remove_powered_by?: boolean;
}

/**
 * Default CSP directives (strict but functional)
 */
const default_csp: Record<string, string | string[]> = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'font-src': ["'self'", 'https:', 'data:'],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'object-src': ["'none'"],
  'script-src': ["'self'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", 'https:', "'unsafe-inline'"],
  'upgrade-insecure-requests': []
};

/**
 * Format CSP directives into header value
 */
function format_csp(directives: Record<string, string | string[]>): string {
  return Object.entries(directives)
    .map(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) {
        return key;
      }
      const value_str = Array.isArray(value) ? value.join(' ') : value;
      return `${key} ${value_str}`;
    })
    .join('; ');
}

/**
 * Security headers middleware (Helmet-style) for protecting against common vulnerabilities.
 *
 * Adds essential security headers to protect against:
 * - XSS attacks
 * - Clickjacking
 * - MIME sniffing
 * - Protocol downgrade attacks
 * - And more
 *
 * @example
 * ```typescript
 * import { bunserve, security } from 'bunserve';
 *
 * const app = bunserve();
 *
 * // Use default security headers
 * app.use(security());
 *
 * // Custom configuration
 * app.use(security({
 *   content_security_policy: {
 *     directives: {
 *       'default-src': ["'self'"],
 *       'script-src': ["'self'", "'unsafe-inline'"], // Allow inline scripts
 *       'style-src': ["'self'", "'unsafe-inline'"],
 *       'img-src': ["'self'", 'https:']
 *     }
 *   },
 *   frame_options: 'SAMEORIGIN'
 * }));
 *
 * // Disable specific headers
 * app.use(security({
 *   content_security_policy: false, // Disable CSP
 *   strict_transport_security: false // Disable HSTS
 * }));
 * ```
 */
export function security(options: SecurityHeadersOptions = {}): Middleware {
  const {
    enabled = true,
    content_security_policy = { directives: default_csp },
    frame_options = 'DENY',
    content_type_options = 'nosniff',
    xss_protection = '1; mode=block',
    strict_transport_security = {
      max_age: 31536000, // 1 year
      include_sub_domains: true,
      preload: false
    },
    referrer_policy = 'no-referrer',
    permissions_policy = {
      camera: [],
      microphone: [],
      geolocation: [],
      'payment': []
    },
    cross_domain_policy = 'none',
    remove_powered_by = true
  } = options;

  if (!enabled) {
    return async (_context, next) => {
      await next();
    };
  }

  return async (context, next) => {
    // Remove X-Powered-By
    if (remove_powered_by) {
      delete context.set.headers['X-Powered-By'];
    }

    // Content Security Policy
    if (content_security_policy) {
      const directives = content_security_policy.directives || default_csp;
      context.set.headers['Content-Security-Policy'] = format_csp(directives);
    }

    // X-Frame-Options
    if (frame_options) {
      context.set.headers['X-Frame-Options'] = frame_options;
    }

    // X-Content-Type-Options
    if (content_type_options) {
      context.set.headers['X-Content-Type-Options'] = content_type_options;
    }

    // X-XSS-Protection
    if (xss_protection) {
      context.set.headers['X-XSS-Protection'] = xss_protection;
    }

    // Strict-Transport-Security
    if (strict_transport_security) {
      const { max_age = 31536000, include_sub_domains = true, preload = false } =
        typeof strict_transport_security === 'object' ? strict_transport_security : {};

      let hsts_value = `max-age=${max_age}`;
      if (include_sub_domains) hsts_value += '; includeSubDomains';
      if (preload) hsts_value += '; preload';

      context.set.headers['Strict-Transport-Security'] = hsts_value;
    }

    // Referrer-Policy
    if (referrer_policy) {
      context.set.headers['Referrer-Policy'] = referrer_policy;
    }

    // Permissions-Policy
    if (permissions_policy) {
      const policy_str = Object.entries(permissions_policy)
        .map(([key, origins]) => {
          if (origins.length === 0) {
            return `${key}=()`;
          }
          return `${key}=(${origins.join(' ')})`;
        })
        .join(', ');

      context.set.headers['Permissions-Policy'] = policy_str;
    }

    // X-Permitted-Cross-Domain-Policies
    if (cross_domain_policy) {
      context.set.headers['X-Permitted-Cross-Domain-Policies'] = cross_domain_policy;
    }

    await next();
  };
}
