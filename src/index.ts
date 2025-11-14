/**
 * BunServe - Express-like typesafe routing library built on Bun.serve.
 *
 * @module BunServe
 * @description A modern, type-safe HTTP routing library for Bun that provides
 * Express-like API with enhanced TypeScript support and request-scoped context management.
 */

// Re-export Context for convenience
export { Context } from '@theinternetfolks/context';
// Health check exports
export {
  create_health_check,
  type HealthCheck,
  type HealthCheckResult,
  simple_health_check
} from './health';
// Middleware exports
export * from './middleware/index';
// Core exports
export { create_router } from './router';
export { create_server } from './server';
export type * from './types';

/**
 * @example
 * ```typescript
 * import { create_router, create_server } from 'bunserve'
 *
 * const router = create_router()
 *
 * router.get('/hello', () => 'Hello World!')
 * router.get('/users/:id', ({ params }) => ({ id: params.id }))
 *
 * const server = create_server({ router })
 * server.listen(3000)
 * ```
 */
