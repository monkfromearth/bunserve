import type { Middleware, RouteContext } from '../types'

/**
 * Error handler middleware options.
 */
export interface ErrorHandlerOptions {
  /** Whether to include stack traces in error responses (default: false in production) */
  include_stack?: boolean
  /** Custom error formatter function */
  format_error?: (error: Error, context: RouteContext<string>) => any
  /** Error logger function */
  log_error?: (error: Error, context: RouteContext<string>) => void
}

/**
 * HTTP error class for structured error responses.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'HttpError'
  }

  /** Create a 400 Bad Request error */
  static bad_request(message: string, details?: any): HttpError {
    return new HttpError(400, message, details)
  }

  /** Create a 401 Unauthorized error */
  static unauthorized(message: string = 'Unauthorized'): HttpError {
    return new HttpError(401, message)
  }

  /** Create a 403 Forbidden error */
  static forbidden(message: string = 'Forbidden'): HttpError {
    return new HttpError(403, message)
  }

  /** Create a 404 Not Found error */
  static not_found(message: string = 'Not Found'): HttpError {
    return new HttpError(404, message)
  }

  /** Create a 409 Conflict error */
  static conflict(message: string, details?: any): HttpError {
    return new HttpError(409, message, details)
  }

  /** Create a 500 Internal Server Error */
  static internal(message: string = 'Internal Server Error'): HttpError {
    return new HttpError(500, message)
  }
}

/**
 * Default error formatter that creates a JSON error response.
 */
function default_error_formatter(error: Error, _context: RouteContext<string>, include_stack: boolean = false): any {
  if (error instanceof HttpError) {
    return {
      error: error.message,
      status: error.status,
      ...(error.details && { details: error.details }),
      ...(include_stack && { stack: error.stack })
    }
  }

  return {
    error: error.message || 'Internal Server Error',
    ...(include_stack && { stack: error.stack })
  }
}

/**
 * Error handling middleware that catches errors from route handlers.
 *
 * @example
 * ```typescript
 * import { create_router } from 'bunserve'
 * import { error_handler, HttpError } from 'bunserve/middleware/error-handler'
 *
 * const router = create_router()
 *
 * // Add error handler as first middleware
 * router.use(error_handler())
 *
 * // Throw errors in routes
 * router.get('/user/:id', ({ params }) => {
 *   if (!users.has(params.id)) {
 *     throw HttpError.not_found('User not found')
 *   }
 *   return users.get(params.id)
 * })
 * ```
 */
export function error_handler(options: ErrorHandlerOptions = {}): Middleware {
  const {
    include_stack = process.env.NODE_ENV !== 'production',
    format_error = default_error_formatter,
    log_error = (error, _context) => console.error('Error:', error)
  } = options

  return async (context, next) => {
    try {
      await next()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Log the error
      log_error(err, context)

      // Set status code
      if (err instanceof HttpError) {
        context.set.status = err.status
      } else {
        context.set.status = 500
      }

      // Format and return error response
      const error_response = format_error(err, context, include_stack)

      // Ensure JSON content type for error responses
      context.set.content = 'json'

      return error_response
    }
  }
}

/**
 * Export error types for convenience.
 */
export { HttpError as Error }
