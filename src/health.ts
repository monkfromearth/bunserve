/**
 * Health check utilities for monitoring server status.
 */

/**
 * Health check function type.
 * Returns true if check passes, false otherwise.
 */
export type HealthCheck = () => Promise<boolean> | boolean;

/**
 * Health check result.
 */
export interface HealthCheckResult {
  /** Overall health status */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** Timestamp of the health check */
  timestamp: string;
  /** Uptime in seconds */
  uptime: number;
  /** Individual check results */
  checks?: Record<string, boolean>;
}

/**
 * Health check configuration options.
 */
export interface HealthCheckOptions {
  /** Custom health checks to run */
  checks?: Record<string, HealthCheck>;
  /** Include system information in response */
  include_system_info?: boolean;
}

/**
 * Create a health check handler.
 *
 * @example
 * ```typescript
 * import { create_router } from 'bunserve'
 * import { create_health_check } from 'bunserve/health'
 * import { Database } from 'bun:sqlite'
 *
 * const db = new Database('app.db')
 *
 * const router = create_router()
 *
 * router.get('/health', create_health_check({
 *   checks: {
 *     database: async () => {
 *       try {
 *         db.query('SELECT 1').get()
 *         return true
 *       } catch {
 *         return false
 *       }
 *     },
 *     memory: () => {
 *       const usage = process.memoryUsage()
 *       return usage.heapUsed < usage.heapTotal * 0.9
 *     }
 *   }
 * }))
 * ```
 */
export function create_health_check(options: HealthCheckOptions = {}) {
  const { checks = {}, include_system_info = false } = options;

  return async (): Promise<HealthCheckResult> => {
    const start_time = performance.now();
    const check_results: Record<string, boolean> = {};

    // Run all health checks
    for (const [name, check] of Object.entries(checks)) {
      try {
        check_results[name] = await check();
      } catch {
        check_results[name] = false;
      }
    }

    // Determine overall status
    const all_passed = Object.values(check_results).every((v) => v === true);
    const any_passed = Object.values(check_results).some((v) => v === true);

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (!all_passed) {
      status = any_passed ? 'degraded' : 'unhealthy';
    }

    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...(Object.keys(checks).length > 0 && { checks: check_results })
    };

    // Add system info if requested
    if (include_system_info) {
      const memory = process.memoryUsage();
      const sys_info = {
        memory: {
          heap_used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          heap_total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
        },
        process: {
          pid: process.pid,
          platform: process.platform,
          version: process.version
        },
        response_time: `${Math.round(performance.now() - start_time)}ms`
      };
      Object.assign(result, { system: sys_info });
    }

    return result;
  };
}

/**
 * Simple health check that always returns healthy.
 * Useful for basic liveness probes.
 */
export function simple_health_check() {
  return (): HealthCheckResult => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
