import type { Middleware, RouteContext } from '../types';

/**
 * Error handler middleware options.
 */
export interface ErrorHandlerOptions {
  /** Whether to include stack traces in error responses (default: false in production) */
  include_stack?: boolean;
  /** Custom error formatter function */
  format_error?: (error: Error, context: RouteContext<string>) => any;
  /** Error logger function */
  log_error?: (error: Error, context: RouteContext<string>) => void;
}

/**
 * Default error formatter that creates a JSON error response.
 * Looks for error.status property to determine HTTP status code.
 */
function default_error_formatter(
  error: Error,
  _context: RouteContext<string>,
  include_stack: boolean = false
): any {
  // Check if error has a status property
  const status = (error as any).status || 500;

  return {
    error: error.message || 'Internal Server Error',
    status,
    ...(include_stack && { stack: error.stack })
  };
}

/**
 * Error handling middleware that catches errors from route handlers.
 *
 * Handles plain Error objects with optional `status` property.
 * If error.status exists, it's used as the HTTP status code, otherwise defaults to 500.
 *
 * @example
 * ```typescript
 * import { bunserve, error_handler } from 'bunserve';
 *
 * const app = bunserve();
 *
 * // Add error handler as first middleware
 * app.use(error_handler());
 *
 * // Throw errors in routes with custom status
 * app.get('/user/:id', ({ params }) => {
 *   if (!users.has(params.id)) {
 *     const error = new Error('User not found');
 *     error.status = 404;
 *     throw error;
 *   }
 *   return users.get(params.id);
 * });
 *
 * // Or define your own error utilities
 * class AppError extends Error {
 *   constructor(message: string, public status: number) {
 *     super(message);
 *   }
 * }
 *
 * app.get('/admin', () => {
 *   throw new AppError('Forbidden', 403);
 * });
 * ```
 */
export function error_handler(options: ErrorHandlerOptions = {}): Middleware {
  const {
    include_stack = process.env.NODE_ENV !== 'production',
    format_error = default_error_formatter,
    log_error = (error, _context) => console.error('Error:', error)
  } = options;

  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log the error
      log_error(err, context);

      // Set status code from error.status property or default to 500
      context.set.status = (err as any).status || 500;

      // Format and return error response
      const error_response = format_error(err, context, include_stack);

      // Ensure JSON content type for error responses
      context.set.content = 'json';

      return error_response;
    }
  };
}
