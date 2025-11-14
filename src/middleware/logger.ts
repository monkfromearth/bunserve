import { Context } from '@theinternetfolks/context';
import type { Middleware } from '../types';

/**
 * Logger middleware configuration options.
 */
export interface LoggerOptions {
  /** Preset configuration (overridden by individual options) */
  preset?: 'development' | 'production' | 'minimal';
  /** Whether to log requests */
  enabled?: boolean;
  /** Log format (default: 'combined') */
  format?: 'combined' | 'common' | 'dev' | 'short' | 'tiny';
  /** Custom log function */
  log?: (message: string) => void;
  /** Skip logging for certain paths */
  skip?: (path: string) => boolean;
}

/**
 * Preset configurations for common logging scenarios.
 */
const PRESETS: Record<string, Partial<LoggerOptions>> = {
  development: {
    format: 'dev',
    enabled: true
  },
  production: {
    format: 'combined',
    enabled: true
  },
  minimal: {
    format: 'tiny',
    enabled: true
  }
};

/**
 * Color codes for terminal output.
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Get color based on HTTP status code.
 */
function get_status_color(status: number): string {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.reset;
}

/**
 * Format log message based on format type.
 */
function format_log(
  format: string,
  method: string,
  url: string,
  status: number,
  duration: number,
  request_id: string
): string {
  const status_color = get_status_color(status);

  switch (format) {
    case 'dev':
      return `${colors.gray}[${request_id}]${colors.reset} ${method} ${url} ${status_color}${status}${colors.reset} ${duration}ms`;

    case 'combined':
      return `${new Date().toISOString()} [${request_id}] ${method} ${url} ${status} ${duration}ms`;

    case 'common':
      return `${method} ${url} ${status} ${duration}ms`;

    case 'short':
      return `${method} ${url} ${status}`;

    case 'tiny':
      return `${method} ${url}`;

    default:
      return `${method} ${url} ${status} ${duration}ms`;
  }
}

/**
 * Logger middleware for request/response logging.
 *
 * @example
 * ```typescript
 * import { bunserve, logger } from 'bunserve';
 *
 * const app = bunserve();
 *
 * // Use preset
 * app.use(logger({ preset: 'development' }));
 *
 * // Production preset
 * app.use(logger({ preset: 'production' }));
 *
 * // Custom configuration (no preset)
 * app.use(logger({
 *   format: 'combined',
 *   skip: (path) => path.startsWith('/health')
 * }));
 *
 * // Preset with overrides
 * app.use(logger({
 *   preset: 'development',
 *   skip: (path) => path === '/health'  // Override preset's skip
 * }));
 * ```
 */
export function logger(options: LoggerOptions = {}): Middleware {
  // Apply preset if specified
  let config: LoggerOptions = { ...options };

  if (options.preset) {
    const preset_config = PRESETS[options.preset];
    if (preset_config) {
      // Merge preset with user options (user options take precedence)
      config = { ...preset_config, ...options };
    }
  }

  const {
    enabled = true,
    format = 'dev',
    log = console.log,
    skip = () => false
  } = config;

  if (!enabled) {
    return async (_context, next) => {
      await next();
    };
  }

  return async (context, next) => {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // Skip logging if specified
    if (skip(path)) {
      await next();
      return;
    }

    const method = context.request.method;
    const ctx = Context.get<{ request_id: string; start_time: number }>();
    const start_time = ctx?.start_time || Date.now();
    const request_id = ctx?.request_id || 'unknown';

    await next();

    const duration = Date.now() - start_time;
    const status = context.set.status;

    const log_message = format_log(
      format,
      method,
      path,
      status,
      duration,
      request_id
    );
    log(log_message);
  };
}

/**
 * @deprecated Use `logger({ preset: 'development' })` instead
 * Preset logger configurations for common scenarios.
 */
export const logger_presets = {
  /**
   * Development logger with colors and request IDs.
   * @deprecated Use `logger({ preset: 'development' })` instead
   */
  development: (): Middleware => logger({ preset: 'development' }),

  /**
   * Production logger with timestamps.
   * @deprecated Use `logger({ preset: 'production' })` instead
   */
  production: (): Middleware => logger({ preset: 'production' }),

  /**
   * Minimal logger for performance.
   * @deprecated Use `logger({ preset: 'minimal' })` instead
   */
  minimal: (): Middleware => logger({ preset: 'minimal' })
};
