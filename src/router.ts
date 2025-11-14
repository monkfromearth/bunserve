import { Context } from '@theinternetfolks/context';
import type {
  BunRequest,
  BunRouteDefinition,
  BunRoutes,
  CookieMap,
  Middleware,
  ResponseSetter,
  RouteContext,
  RouteHandler,
  RouteRegistration,
  Router
} from './types';

/**
 * Router implementation that builds Bun-native routes for optimal performance.
 * Instead of custom route matching, delegates to Bun's native router.
 */
class RouterImpl implements Router {
  /** Array of registered route handlers */
  private registrations: RouteRegistration[] = [];
  /** Array of global middleware functions */
  private global_middlewares: Middleware[] = [];

  /**
   * Generate a unique request ID for tracking and debugging.
   * @returns Unique identifier string
   */
  private generate_request_id(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Add a route registration.
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Route path pattern
   * @param handler - Route handler function
   * @param middlewares - Array of middleware functions (optional)
   */
  private add_route<TPath extends string>(
    method: string,
    path: TPath,
    handler: RouteHandler<TPath>,
    middlewares: Middleware[] = []
  ): void {
    this.registrations.push({
      method,
      path,
      handler,
      middlewares
    } as RouteRegistration<TPath>);
  }

  /**
   * Execute a chain of middleware functions and the route handler.
   * @param context - Route context
   * @param middlewares - Array of middleware functions to execute
   * @param handler - Route handler function
   * @returns Promise resolving to the handler result
   */
  private async execute_middleware_chain(
    context: RouteContext<string>,
    middlewares: Middleware[],
    handler: RouteHandler<string>
  ): Promise<any> {
    let index = 0;
    let handler_result: any = null;

    const next = async (): Promise<void> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        if (middleware) {
          const middleware_result = await middleware(context, next);
          // If middleware returns a value, use it as the result
          if (middleware_result !== undefined) {
            handler_result = middleware_result;
          }
        }
      } else {
        // All middleware executed, call handler
        handler_result = await handler(context);
      }
    };

    await next();
    return handler_result;
  }

  /**
   * Create a route context from a BunRequest.
   * @param request - Bun request object with native params and cookies
   * @returns Promise resolving to route context
   */
  private async create_route_context<TPath extends string>(
    request: BunRequest<TPath>
  ): Promise<RouteContext<TPath>> {
    const url = new URL(request.url);
    const query: Record<string, string> = {};

    // Initialize context for each request
    Context.init();
    Context.set({
      request_id: this.generate_request_id(),
      start_time: Date.now(),
      request: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      }
    });

    // Parse query parameters
    for (const [key, value] of url.searchParams) {
      query[key] = value;
    }

    // Parse body if present
    let body: any = null;
    const content_type = request.headers.get('content-type');

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (content_type?.includes('application/json')) {
        body = await request.json().catch(() => null);
      } else if (content_type?.includes('application/x-www-form-urlencoded')) {
        const form_data = await request.formData();
        body = Object.fromEntries(form_data);
      } else if (content_type?.includes('multipart/form-data')) {
        body = await request.formData();
      } else {
        body = await request.text().catch(() => null);
      }
    }

    // Initialize response setter
    const set: ResponseSetter = {
      status: 200,
      content: 'auto', // Will be determined based on result type
      headers: {},
      cache: undefined,
      redirect: undefined
    };

    return {
      request,
      params: request.params,
      query,
      body,
      cookies: request.cookies,
      set
    };
  }

  /**
   * Build an HTTP response from the handler result and response configuration.
   * @param result - Result returned from route handler
   * @param set - Response configuration object
   * @param cookies - CookieMap for handling cookie modifications
   * @returns Promise resolving to HTTP Response object
   */
  private async build_response(
    result: any,
    set: ResponseSetter,
    _cookies: CookieMap
  ): Promise<Response> {
    // Handle redirects
    if (set.redirect) {
      return Response.redirect(set.redirect, set.status);
    }

    // Handle different content types
    let body: string | Uint8Array | null = null;
    const headers: Record<string, string> = { ...set.headers };

    // Handle different content types
    if (
      set.content === 'json' ||
      (set.content === 'auto' && typeof result === 'object' && result !== null)
    ) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(result);
    } else if (set.content === 'text') {
      headers['Content-Type'] = 'text/plain';
      body = String(result);
    } else if (set.content === 'auto') {
      // For auto mode, determine content type based on result type
      if (typeof result === 'string') {
        headers['Content-Type'] = 'text/plain';
        body = result;
      } else if (typeof result === 'object' && result !== null) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(result);
      } else {
        headers['Content-Type'] = 'text/plain';
        body = String(result);
      }
    } else if (set.content === 'html') {
      headers['Content-Type'] = 'text/html';
      body = String(result);
    } else if (set.content === 'xml') {
      headers['Content-Type'] = 'application/xml';
      body = String(result);
    } else if (
      set.content === 'png' ||
      set.content === 'svg' ||
      set.content === 'gif' ||
      set.content === 'webp'
    ) {
      headers['Content-Type'] = `image/${set.content}`;
      if (typeof result === 'string') {
        body = Buffer.from(result, 'base64');
      }
    } else if (typeof set.content === 'object' && set.content.type === 'csv') {
      headers['Content-Type'] = 'text/csv';
      headers['Content-Disposition'] =
        `attachment; filename="${set.content.filename}"`;
      body = String(result);
    } else {
      // Fallback
      headers['Content-Type'] = 'text/plain';
      body = String(result);
    }

    // Handle null/undefined results
    if (result === null || result === undefined) {
      body = null;
    }

    // Set cache headers
    if (set.cache) {
      headers['Cache-Control'] =
        `public, max-age=${this.parse_cache_duration(set.cache)}`;
    }

    // Note: Cookies are handled automatically by Bun when using req.cookies
    // Any modifications to req.cookies are automatically applied to the response

    return new Response(body, {
      status: set.status,
      headers
    });
  }

  /**
   * Parse cache duration string into seconds.
   * @param duration - Cache duration string (e.g., '1h', '30d', '7d')
   * @returns Duration in seconds
   */
  private parse_cache_duration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = match[1];
    const unit = match[2];
    if (!value || !unit) return 0;

    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 60 * 60;
      case 'd':
        return num * 24 * 60 * 60;
      default:
        return 0;
    }
  }

  /**
   * Wrap a route handler with middleware execution and response building.
   * @param handler - Route handler function
   * @param middlewares - Array of middleware functions
   * @returns Bun-compatible route handler
   */
  private wrap_handler<TPath extends string>(
    handler: RouteHandler<TPath>,
    middlewares: Middleware[]
  ): (req: BunRequest<TPath>) => Promise<Response> {
    return async (req: BunRequest<TPath>): Promise<Response> => {
      try {
        // Create route context
        const context = await this.create_route_context(req);

        // Combine global and route-specific middleware
        const all_middlewares = [...this.global_middlewares, ...middlewares];

        // Execute middleware chain
        const result = await this.execute_middleware_chain(
          context as RouteContext<string>,
          all_middlewares,
          handler as RouteHandler<string>
        );

        // Build and return response
        return await this.build_response(result, context.set, context.cookies);
      } catch (error) {
        console.error('Route execution error:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    };
  }

  /**
   * Build Bun-compatible routes object from registered routes.
   * Groups routes by path and method for optimal Bun.serve performance.
   * @returns Bun routes object
   */
  build_routes(): BunRoutes {
    const routes: BunRoutes = {};

    // Group routes by path
    const path_groups = new Map<string, Map<string, RouteRegistration>>();

    for (const registration of this.registrations) {
      if (!path_groups.has(registration.path)) {
        path_groups.set(registration.path, new Map());
      }
      const methods = path_groups.get(registration.path);
      if (methods) {
        methods.set(registration.method, registration);
      }
    }

    // Build Bun routes
    for (const [path, methods] of path_groups) {
      if (methods.size === 1) {
        // Single method - use simple handler
        const registration = Array.from(methods.values())[0];
        if (registration) {
          routes[path] = this.wrap_handler(
            registration.handler,
            registration.middlewares
          );
        }
      } else {
        // Multiple methods - use method object
        const route_def: BunRouteDefinition = {};

        for (const [method, registration] of methods) {
          const wrapped = this.wrap_handler(
            registration.handler,
            registration.middlewares
          );

          if (method === 'ALL') {
            // For 'ALL', add to all methods
            route_def.GET = wrapped;
            route_def.POST = wrapped;
            route_def.PUT = wrapped;
            route_def.PATCH = wrapped;
            route_def.DELETE = wrapped;
            route_def.OPTIONS = wrapped;
            route_def.HEAD = wrapped;
          } else {
            route_def[method as keyof BunRouteDefinition] = wrapped;
          }
        }

        routes[path] = route_def;
      }
    }

    return routes;
  }

  /**
   * Register a GET route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  get<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a GET route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  get<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a GET route (overloaded implementation).
   */
  get<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('GET', path, arg3, arg2);
    } else {
      this.add_route('GET', path, arg2);
    }
  }

  /**
   * Register a POST route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  post<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a POST route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  post<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a POST route (overloaded implementation).
   */
  post<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('POST', path, arg3, arg2);
    } else {
      this.add_route('POST', path, arg2);
    }
  }

  /**
   * Register a PUT route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  put<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a PUT route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  put<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a PUT route (overloaded implementation).
   */
  put<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('PUT', path, arg3, arg2);
    } else {
      this.add_route('PUT', path, arg2);
    }
  }

  /**
   * Register a PATCH route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  patch<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a PATCH route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  patch<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a PATCH route (overloaded implementation).
   */
  patch<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('PATCH', path, arg3, arg2);
    } else {
      this.add_route('PATCH', path, arg2);
    }
  }

  /**
   * Register a DELETE route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  delete<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a DELETE route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  delete<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a DELETE route (overloaded implementation).
   */
  delete<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('DELETE', path, arg3, arg2);
    } else {
      this.add_route('DELETE', path, arg2);
    }
  }

  /**
   * Register an OPTIONS route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  options<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register an OPTIONS route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  options<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register an OPTIONS route (overloaded implementation).
   */
  options<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('OPTIONS', path, arg3, arg2);
    } else {
      this.add_route('OPTIONS', path, arg2);
    }
  }

  /**
   * Register a HEAD route.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  head<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a HEAD route with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  head<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a HEAD route (overloaded implementation).
   */
  head<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('HEAD', path, arg3, arg2);
    } else {
      this.add_route('HEAD', path, arg2);
    }
  }

  /**
   * Register a route for all HTTP methods.
   * @param path - Route path pattern
   * @param handler - Route handler function
   */
  all<Path extends string>(path: Path, handler: RouteHandler<Path>): void;

  /**
   * Register a route for all HTTP methods with middleware.
   * @param path - Route path pattern
   * @param middlewares - Array of middleware functions
   * @param handler - Route handler function
   */
  all<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void;

  /**
   * Register a route for all HTTP methods (overloaded implementation).
   */
  all<Path extends string>(path: Path, arg2: any, arg3?: any): void {
    if (Array.isArray(arg2)) {
      this.add_route('ALL', path, arg3, arg2);
    } else {
      this.add_route('ALL', path, arg2);
    }
  }

  /**
   * Add a global middleware or mount a sub-router at a path.
   * @param middleware_or_path - Middleware function or path prefix
   * @param router - Optional router to mount at the path
   */
  use(middleware_or_path: Middleware | string, router?: Router): void {
    if (typeof middleware_or_path === 'string' && router) {
      // Mount sub-router at path - get all its routes and prepend path
      const sub_router = router as RouterImpl;
      const sub_routes = sub_router.registrations;

      for (const route of sub_routes) {
        // Prepend the mount path to each sub-route
        const full_path = middleware_or_path + route.path;
        this.registrations.push({
          ...route,
          path: full_path
        });
      }

      // Also add sub-router's global middlewares
      this.global_middlewares.push(...sub_router.global_middlewares);
    } else {
      // Add global middleware
      this.global_middlewares.push(middleware_or_path as Middleware);
    }
  }
}

/**
 * Factory function to create a new router instance.
 * Used for creating sub-routers that can be mounted on the main app.
 * @returns New router instance
 * @example
 * ```typescript
 * const api_router = router();
 * api_router.get('/posts', handler);
 * app.use('/api', api_router);
 * ```
 */
export function router(): Router {
  return new RouterImpl();
}

// Export RouterImpl for internal use by server
export { RouterImpl };
