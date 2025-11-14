import type { Middleware } from '../types';

/**
 * Security headers middleware configuration options.
 */
export interface SecurityHeadersOptions {
  /** Enable all security headers (default: true) */
  enabled?: boolean;

  /** Content Security Policy (default: strict policy) */
  contentSecurityPolicy?:
    | false
    | {
        directives?: Record<string, string | string[]>;
      };

  /** X-Frame-Options (default: 'DENY') */
  frameOptions?: false | 'DENY' | 'SAMEORIGIN';

  /** X-Content-Type-Options (default: 'nosniff') */
  contentTypeOptions?: false | 'nosniff';

  /** X-XSS-Protection (default: '1; mode=block') */
  xssProtection?: false | '0' | '1' | '1; mode=block';

  /** Strict-Transport-Security (default: enabled with 1 year) */
  strictTransportSecurity?:
    | false
    | {
        maxAge?: number;
        includeSubDomains?: boolean;
        preload?: boolean;
      };

  /** Referrer-Policy (default: 'no-referrer') */
  referrerPolicy?:
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
  permissionsPolicy?: false | Record<string, string[]>;

  /** X-Permitted-Cross-Domain-Policies (default: 'none') */
  crossDomainPolicy?: false | 'none' | 'master-only' | 'by-content-type' | 'all';

  /** Remove X-Powered-By header (default: true) */
  removePoweredBy?: boolean;
}

/**
 * Default CSP directives (strict but functional)
 */
const defaultCSP: Record<string, string | string[]> = {
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
function formatCSP(directives: Record<string, string | string[]>): string {
  return Object.entries(directives)
    .map(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) {
        return key;
      }
      const valueStr = Array.isArray(value) ? value.join(' ') : value;
      return `${key} ${valueStr}`;
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
 *   contentSecurityPolicy: {
 *     directives: {
 *       'default-src': ["'self'"],
 *       'script-src': ["'self'", "'unsafe-inline'"], // Allow inline scripts
 *       'style-src': ["'self'", "'unsafe-inline'"],
 *       'img-src': ["'self'", 'https:']
 *     }
 *   },
 *   frameOptions: 'SAMEORIGIN'
 * }));
 *
 * // Disable specific headers
 * app.use(security({
 *   contentSecurityPolicy: false, // Disable CSP
 *   strictTransportSecurity: false // Disable HSTS
 * }));
 * ```
 */
export function security(options: SecurityHeadersOptions = {}): Middleware {
  const {
    enabled = true,
    contentSecurityPolicy = { directives: defaultCSP },
    frameOptions = 'DENY',
    contentTypeOptions = 'nosniff',
    xssProtection = '1; mode=block',
    strictTransportSecurity = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false
    },
    referrerPolicy = 'no-referrer',
    permissionsPolicy = {
      camera: [],
      microphone: [],
      geolocation: [],
      'payment': []
    },
    crossDomainPolicy = 'none',
    removePoweredBy = true
  } = options;

  if (!enabled) {
    return async (_context, next) => {
      await next();
    };
  }

  return async (context, next) => {
    // Remove X-Powered-By
    if (removePoweredBy) {
      delete context.set.headers['X-Powered-By'];
    }

    // Content Security Policy
    if (contentSecurityPolicy) {
      const directives = contentSecurityPolicy.directives || defaultCSP;
      context.set.headers['Content-Security-Policy'] = formatCSP(directives);
    }

    // X-Frame-Options
    if (frameOptions) {
      context.set.headers['X-Frame-Options'] = frameOptions;
    }

    // X-Content-Type-Options
    if (contentTypeOptions) {
      context.set.headers['X-Content-Type-Options'] = contentTypeOptions;
    }

    // X-XSS-Protection
    if (xssProtection) {
      context.set.headers['X-XSS-Protection'] = xssProtection;
    }

    // Strict-Transport-Security
    if (strictTransportSecurity) {
      const { maxAge = 31536000, includeSubDomains = true, preload = false } =
        typeof strictTransportSecurity === 'object' ? strictTransportSecurity : {};

      let hstsValue = `max-age=${maxAge}`;
      if (includeSubDomains) hstsValue += '; includeSubDomains';
      if (preload) hstsValue += '; preload';

      context.set.headers['Strict-Transport-Security'] = hstsValue;
    }

    // Referrer-Policy
    if (referrerPolicy) {
      context.set.headers['Referrer-Policy'] = referrerPolicy;
    }

    // Permissions-Policy
    if (permissionsPolicy) {
      const policyStr = Object.entries(permissionsPolicy)
        .map(([key, origins]) => {
          if (origins.length === 0) {
            return `${key}=()`;
          }
          return `${key}=(${origins.join(' ')})`;
        })
        .join(', ');

      context.set.headers['Permissions-Policy'] = policyStr;
    }

    // X-Permitted-Cross-Domain-Policies
    if (crossDomainPolicy) {
      context.set.headers['X-Permitted-Cross-Domain-Policies'] = crossDomainPolicy;
    }

    await next();
  };
}
