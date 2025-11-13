import type { Middleware } from '../types'

/**
 * CORS middleware configuration options.
 */
export interface CorsOptions {
  /** Allowed origins (string, array, or function returning boolean) */
  origin?: string | string[] | ((origin: string) => boolean)
  /** Allowed HTTP methods */
  methods?: string[]
  /** Allowed headers */
  allowed_headers?: string[]
  /** Exposed headers */
  exposed_headers?: string[]
  /** Allow credentials */
  credentials?: boolean
  /** Max age for preflight cache (in seconds) */
  max_age?: number
}

/**
 * CORS middleware for handling Cross-Origin Resource Sharing.
 *
 * @example
 * ```typescript
 * import { create_router } from 'bunserve'
 * import { cors } from 'bunserve/middleware/cors'
 *
 * const router = create_router()
 *
 * // Allow all origins
 * router.use(cors())
 *
 * // Custom configuration
 * router.use(cors({
 *   origin: ['https://example.com', 'https://app.example.com'],
 *   methods: ['GET', 'POST', 'PUT', 'DELETE'],
 *   credentials: true,
 *   max_age: 86400
 * }))
 *
 * // Dynamic origin validation
 * router.use(cors({
 *   origin: (origin) => origin.endsWith('.example.com')
 * }))
 * ```
 */
export function cors(options: CorsOptions = {}): Middleware {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowed_headers = ['Content-Type', 'Authorization'],
    exposed_headers = [],
    credentials = false,
    max_age = 86400
  } = options

  return async (context, next) => {
    const request_origin = context.request.headers.get('origin')

    // Determine if origin is allowed
    let allowed_origin = '*'

    if (typeof origin === 'string') {
      allowed_origin = origin
    } else if (Array.isArray(origin)) {
      if (request_origin && origin.includes(request_origin)) {
        allowed_origin = request_origin
      } else {
        allowed_origin = origin[0] || '*'
      }
    } else if (typeof origin === 'function' && request_origin) {
      if (origin(request_origin)) {
        allowed_origin = request_origin
      }
    }

    // Set CORS headers
    context.set.headers['Access-Control-Allow-Origin'] = allowed_origin

    if (credentials) {
      context.set.headers['Access-Control-Allow-Credentials'] = 'true'
    }

    if (methods.length > 0) {
      context.set.headers['Access-Control-Allow-Methods'] = methods.join(', ')
    }

    if (allowed_headers.length > 0) {
      context.set.headers['Access-Control-Allow-Headers'] = allowed_headers.join(', ')
    }

    if (exposed_headers.length > 0) {
      context.set.headers['Access-Control-Expose-Headers'] = exposed_headers.join(', ')
    }

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.set.headers['Access-Control-Max-Age'] = String(max_age)
      context.set.status = 204
      return null
    }

    await next()
  }
}

/**
 * Preset CORS configurations for common scenarios.
 */
export const cors_presets = {
  /**
   * Allow all origins (default, least secure).
   */
  allow_all: (): Middleware => cors(),

  /**
   * Development-friendly CORS (allows localhost).
   */
  development: (): Middleware => cors({
    origin: (origin) => {
      return origin.includes('localhost') || origin.includes('127.0.0.1')
    },
    credentials: true
  }),

  /**
   * Strict CORS for production (requires explicit origin list).
   */
  production: (allowed_origins: string[]): Middleware => cors({
    origin: allowed_origins,
    credentials: true,
    max_age: 86400
  })
}
