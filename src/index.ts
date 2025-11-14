/**
 * BunServe - Express-like typesafe routing library built on Bun.serve.
 *
 * @module BunServe
 * @description A modern, type-safe HTTP routing library for Bun that provides
 * Express-like API with enhanced TypeScript support and request-scoped context management.
 */

// Re-export Context for convenience
export { Context } from '@theinternetfolks/context';
// Middleware exports
export * from './middleware/index';
// Core exports
export { router } from './router';
export { bunserve } from './server';
export type { ServerOptions } from './server';
export type * from './types';

/**
 * @example
 * ```typescript
 * import { bunserve, router } from 'bunserve';
 *
 * const app = bunserve();
 *
 * app.get('/hello', () => 'Hello World!');
 * app.get('/users/:id', ({ params }) => ({ id: params.id }));
 *
 * // Create and mount sub-router
 * const api = router();
 * api.get('/posts', () => ({ posts: [] }));
 * app.use('/api', api);
 *
 * app.listen(3000);
 * ```
 */
