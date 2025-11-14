import { RouterImpl, router } from './router';
import type { Middleware, Router } from './types';

/**
 * Configuration options for BunServe server.
 */
export interface ServerOptions {
  /** Default port to listen on (default: 3000) */
  port?: number;
  /** Default host to bind to (default: 'localhost') */
  host?: string;
  /** Optional hook that runs before each request */
  before_each?: (request: Request) => void;
}

/**
 * Server interface extending Router with server lifecycle management.
 * The app IS a router, but also has server capabilities.
 */
export interface Server extends Router {
  /** Start the server listening on the specified port */
  listen(port?: number, host?: string): void;
  /** Get the underlying Bun server instance */
  get_bun_server(): any;
  /** Handle a single HTTP request (useful for testing) */
  fetch(request: Request): Promise<Response>;
  /** Stop the server and release resources */
  close(): Promise<void>;
}

/**
 * Server implementation that IS a router with server capabilities.
 * Delegates all routing to internal RouterImpl.
 */
class ServerImpl implements Server {
  /** Underlying Bun.serve instance */
  private bun_server: any;
  /** Internal router for handling routes */
  private router: RouterImpl;
  /** Default port */
  private default_port: number;
  /** Default host */
  private default_host: string;
  /** Optional before_each hook */
  private before_each_hook?: (request: Request) => void;

  /**
   * Create a new server instance.
   */
  constructor(options: ServerOptions = {}) {
    this.router = router() as RouterImpl;
    this.default_port = options.port || 3000;
    this.default_host = options.host || 'localhost';
    this.before_each_hook = options.before_each;
  }

  // ==========================================
  // Router methods - delegate to internal router
  // ==========================================

  get<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.get(path, ...args);
  }

  post<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.post(path, ...args);
  }

  put<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.put(path, ...args);
  }

  patch<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.patch(path, ...args);
  }

  delete<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.delete(path, ...args);
  }

  options<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.options(path, ...args);
  }

  head<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.head(path, ...args);
  }

  all<Path extends string>(path: Path, ...args: any[]): void {
    // @ts-expect-error - args spread
    this.router.all(path, ...args);
  }

  use(middleware_or_path: Middleware | string, router?: Router): void {
    if (typeof middleware_or_path === 'string' && router) {
      // Mount sub-router at path
      this.router.use(middleware_or_path, router);
    } else {
      // Add global middleware
      this.router.use(middleware_or_path as Middleware);
    }
  }

  build_routes() {
    return this.router.build_routes();
  }

  // ==========================================
  // Server lifecycle methods
  // ==========================================

  /**
   * Start the server listening on the specified port.
   * @param port - Port number to listen on (default: 3000)
   * @param host - Host to bind to (default: 'localhost')
   */
  listen(port?: number, host?: string): void {
    const listen_port = port || this.default_port;
    const listen_host = host || this.default_host;

    // Build Bun-native routes from internal router
    const routes = this.router.build_routes();

    // Create Bun server with native routes
    this.bun_server = Bun.serve({
      port: listen_port,
      hostname: listen_host,
      routes: routes as any, // Type cast needed due to Bun's internal types
      // Fallback fetch for unmatched routes
      fetch: (_req: Request) => {
        return new Response('Not Found', { status: 404 });
      }
    });

    console.log(
      `🚀 BunServe server running at http://${listen_host}:${listen_port}`
    );
  }

  /**
   * Get the underlying Bun server instance.
   * Useful for accessing Bun-specific APIs like server.pendingRequests.
   */
  get_bun_server(): any {
    return this.bun_server;
  }

  /**
   * Convert a route path pattern to a regex for matching.
   * @param pattern - Route path pattern (e.g., '/users/:id' or '/api/*')
   * @returns Object with regex, parameter names, and wildcard flag
   */
  private pattern_to_regex(pattern: string): {
    regex: RegExp;
    params: string[];
    has_wildcard: boolean;
  } {
    const params: string[] = [];
    let regex_str = pattern;
    let has_wildcard = false;

    // Handle wildcard routes - store wildcard position
    if (regex_str.includes('*')) {
      has_wildcard = true;
      params.push('*');
      regex_str = regex_str.replace(/\*/g, '(.*)');
    }

    // Convert :param to capture groups
    regex_str = regex_str.replace(/:(\w+)/g, (_, param_name) => {
      params.push(param_name);
      return '([^/]+)';
    });

    return {
      regex: new RegExp(`^${regex_str}$`),
      params,
      has_wildcard
    };
  }

  /**
   * Extract parameters from a matched route.
   * @param param_names - Array of parameter names
   * @param match - Regex match result
   * @returns Object mapping parameter names to values
   */
  private extract_params(
    param_names: string[],
    match: RegExpMatchArray
  ): Record<string, string> {
    const params: Record<string, string> = {};
    for (let i = 0; i < param_names.length; i++) {
      const param_name = param_names[i];
      if (param_name) {
        params[param_name] = match[i + 1] || '';
      }
    }
    return params;
  }

  /**
   * Handle an incoming HTTP request.
   * This method is useful for testing routes without starting a server.
   * @param request - HTTP request object
   * @returns Promise resolving to HTTP response
   */
  async fetch(request: Request): Promise<Response> {
    // Build routes and manually dispatch to the matching route
    const routes = this.router.build_routes();
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Find matching route
    for (const [route_path, handler] of Object.entries(routes)) {
      // Convert route pattern to regex for matching
      const {
        regex,
        params: param_names,
        has_wildcard
      } = this.pattern_to_regex(route_path);
      const match = pathname.match(regex);

      if (match) {
        // Extract parameters
        const params = this.extract_params(param_names, match);

        if (typeof handler === 'function') {
          // Cast request to BunRequest-like object
          const bun_req = request as any;
          bun_req.params = params;
          bun_req.cookies = new Map();
          return await handler(bun_req);
        } else if (handler instanceof Response) {
          return handler;
        } else {
          // Route definition with HTTP methods
          const method = request.method as keyof typeof handler;
          const method_handler = method ? handler[method] : undefined;
          if (method_handler) {
            if (typeof method_handler === 'function') {
              const bun_req = request as any;
              bun_req.params = params;
              bun_req.cookies = new Map();
              return await method_handler(bun_req);
            } else {
              return method_handler;
            }
          }
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Stop the server and release resources.
   */
  async close(): Promise<void> {
    if (this.bun_server) {
      await this.bun_server.stop();
      console.log('🛑 Server stopped');
    }
  }
}

/**
 * Factory function to create a new BunServe app instance.
 * The app is a router with server capabilities (like Express).
 * @param options - Optional server configuration
 * @returns New server instance that implements Router
 */
export function bunserve(options?: ServerOptions): Server {
  return new ServerImpl(options);
}
