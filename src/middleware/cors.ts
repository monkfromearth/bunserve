import type { Middleware } from '../types';

/**
 * CORS middleware configuration options.
 */
export interface CorsOptions {
  /** Preset configuration (overridden by individual options) */
  preset?: 'allow_all' | 'development' | 'production';
  /** Allowed origins for production preset */
  allowed_origins?: string[];
  /** Allowed origins (string, array, or function returning boolean) */
  origin?: string | string[] | ((origin: string) => boolean);
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed headers */
  allowed_headers?: string[];
  /** Exposed headers */
  exposed_headers?: string[];
  /** Allow credentials */
  credentials?: boolean;
  /** Max age for preflight cache (in seconds) */
  max_age?: number;
}

/**
 * Preset configurations for common CORS scenarios.
 */
const PRESETS: Record<string, Partial<CorsOptions>> = {
  allow_all: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowed_headers: ['Content-Type', 'Authorization'],
    credentials: false,
    max_age: 86400
  },
  development: {
    origin: (origin: string) =>
      origin.includes('localhost') || origin.includes('127.0.0.1'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowed_headers: ['Content-Type', 'Authorization'],
    credentials: true,
    max_age: 86400
  },
  production: {
    // origin set via allowed_origins parameter
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowed_headers: ['Content-Type', 'Authorization'],
    credentials: true,
    max_age: 86400
  }
};

/**
 * CORS middleware for handling Cross-Origin Resource Sharing.
 *
 * @example
 * ```typescript
 * import { bunserve, cors } from 'bunserve';
 *
 * const app = bunserve();
 *
 * // Use preset
 * app.use(cors({ preset: 'development' }));
 *
 * // Production preset with allowed origins
 * app.use(cors({
 *   preset: 'production',
 *   allowed_origins: ['https://example.com', 'https://app.example.com']
 * }));
 *
 * // Custom configuration (no preset)
 * app.use(cors({
 *   origin: ['https://example.com'],
 *   methods: ['GET', 'POST'],
 *   credentials: true
 * }));
 *
 * // Preset with overrides
 * app.use(cors({
 *   preset: 'development',
 *   max_age: 3600  // Override preset's max_age
 * }));
 * ```
 */
export function cors(options: CorsOptions = {}): Middleware {
  // Apply preset if specified
  let config: CorsOptions = { ...options };

  if (options.preset) {
    const preset_config = PRESETS[options.preset];
    if (preset_config) {
      // Merge preset with user options (user options take precedence)
      config = { ...preset_config, ...options };

      // Handle production preset's allowed_origins
      if (options.preset === 'production' && options.allowed_origins) {
        config.origin = options.allowed_origins;
      }
    }
  }

  // Set defaults
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowed_headers = ['Content-Type', 'Authorization'],
    exposed_headers = [],
    credentials = false,
    max_age = 86400
  } = config;

  return async (context, next) => {
    const request_origin = context.request.headers.get('origin');

    // Determine if origin is allowed
    let allowed_origin = '*';

    if (typeof origin === 'string') {
      allowed_origin = origin;
    } else if (Array.isArray(origin)) {
      if (request_origin && origin.includes(request_origin)) {
        allowed_origin = request_origin;
      } else {
        allowed_origin = origin[0] || '*';
      }
    } else if (typeof origin === 'function' && request_origin) {
      if (origin(request_origin)) {
        allowed_origin = request_origin;
      }
    }

    // Set CORS headers
    context.set.headers['Access-Control-Allow-Origin'] = allowed_origin;

    if (credentials) {
      context.set.headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (methods.length > 0) {
      context.set.headers['Access-Control-Allow-Methods'] = methods.join(', ');
    }

    if (allowed_headers.length > 0) {
      context.set.headers['Access-Control-Allow-Headers'] =
        allowed_headers.join(', ');
    }

    if (exposed_headers.length > 0) {
      context.set.headers['Access-Control-Expose-Headers'] =
        exposed_headers.join(', ');
    }

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.set.headers['Access-Control-Max-Age'] = String(max_age);
      context.set.status = 204;
      return null;
    }

    await next();
  };
}

/**
 * @deprecated Use `cors({ preset: 'allow_all' })` instead
 * Preset CORS configurations for common scenarios.
 */
export const cors_presets = {
  /**
   * Allow all origins (default, least secure).
   * @deprecated Use `cors({ preset: 'allow_all' })` instead
   */
  allow_all: (): Middleware => cors({ preset: 'allow_all' }),

  /**
   * Development-friendly CORS (allows localhost).
   * @deprecated Use `cors({ preset: 'development' })` instead
   */
  development: (): Middleware => cors({ preset: 'development' }),

  /**
   * Strict CORS for production (requires explicit origin list).
   * @deprecated Use `cors({ preset: 'production', allowed_origins: [...] })` instead
   */
  production: (allowed_origins: string[]): Middleware =>
    cors({ preset: 'production', allowed_origins })
};
