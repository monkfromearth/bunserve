import type { Router, ServerConfig } from './types'
import { RouterImpl } from './router'

/**
 * Server interface for HTTP server lifecycle management.
 */
export interface Server {
  /** Start the server listening on the specified port */
  listen(port?: number): void
  /** Get the underlying Bun server instance */
  get_bun_server(): any
  /** Handle a single HTTP request (useful for testing) */
  fetch(request: Request): Promise<Response>
  /** Stop the server and release resources */
  close(): Promise<void>
}

/**
 * Server implementation providing HTTP server functionality using Bun.serve.
 * Delegates routing to Bun's native router for optimal performance.
 */
class ServerImpl implements Server {
  /** Underlying Bun.serve instance */
  private bun_server: any
  /** Router instance for building routes */
  private router: RouterImpl
  /** Server configuration */
  private config: ServerConfig

  /**
   * Create a new server instance.
   * @param config - Server configuration including router and optional settings
   */
  constructor(config: ServerConfig) {
    this.router = config.router as RouterImpl
    this.config = {
      port: 3000,
      host: 'localhost',
      ...config
    }
  }

  /**
   * Start the server listening on the specified port.
   * @param port - Port number to listen on (uses config default if not specified)
   */
  listen(port?: number): void {
    const listen_port = port || this.config.port || 3000

    // Build Bun-native routes from router
    const routes = this.router.build_routes()

    // Create Bun server with native routes
    this.bun_server = Bun.serve({
      port: listen_port,
      hostname: this.config.host,
      routes: routes as any, // Type cast needed due to Bun's internal types
      // Fallback fetch for unmatched routes
      fetch: (req: Request) => {
        // If before_each is defined, call it
        if (this.config.before_each) {
          this.config.before_each(req)
        }
        return new Response('Not Found', { status: 404 })
      }
    })

    console.log(`🚀 BunServe server running at http://${this.config.host}:${listen_port}`)
  }

  /**
   * Get the underlying Bun server instance.
   * Useful for accessing Bun-specific APIs like server.pendingRequests.
   */
  get_bun_server(): any {
    return this.bun_server
  }

  /**
   * Convert a route path pattern to a regex for matching.
   * @param pattern - Route path pattern (e.g., '/users/:id' or '/api/*')
   * @returns Object with regex, parameter names, and wildcard flag
   */
  private pattern_to_regex(pattern: string): { regex: RegExp; params: string[]; has_wildcard: boolean } {
    const params: string[] = []
    let regex_str = pattern
    let has_wildcard = false

    // Handle wildcard routes - store wildcard position
    if (regex_str.includes('*')) {
      has_wildcard = true
      params.push('*')
      regex_str = regex_str.replace(/\*/g, '(.*)')
    }

    // Convert :param to capture groups
    regex_str = regex_str.replace(/:(\w+)/g, (_, param_name) => {
      params.push(param_name)
      return '([^/]+)'
    })

    return {
      regex: new RegExp(`^${regex_str}$`),
      params,
      has_wildcard
    }
  }

  /**
   * Extract parameters from a matched route.
   * @param param_names - Array of parameter names
   * @param match - Regex match result
   * @returns Object mapping parameter names to values
   */
  private extract_params(param_names: string[], match: RegExpMatchArray): Record<string, string> {
    const params: Record<string, string> = {}
    for (let i = 0; i < param_names.length; i++) {
      const param_name = param_names[i]
      if (param_name) {
        params[param_name] = match[i + 1] || ''
      }
    }
    return params
  }

  /**
   * Handle an incoming HTTP request.
   * This method is useful for testing routes without starting a server.
   * @param request - HTTP request object
   * @returns Promise resolving to HTTP response
   */
  async fetch(request: Request): Promise<Response> {
    // Build routes and manually dispatch to the matching route
    const routes = this.router.build_routes()
    const url = new URL(request.url)
    const pathname = url.pathname

    // Find matching route
    for (const [route_path, handler] of Object.entries(routes)) {
      // Convert route pattern to regex for matching
      const { regex, params: param_names, has_wildcard } = this.pattern_to_regex(route_path)
      const match = pathname.match(regex)

      if (match) {
        // Extract parameters
        const params = this.extract_params(param_names, match)

        if (typeof handler === 'function') {
          // Cast request to BunRequest-like object
          const bun_req = request as any
          bun_req.params = params
          bun_req.cookies = new Map()
          return await handler(bun_req)
        } else if (handler instanceof Response) {
          return handler
        } else {
          // Route definition with HTTP methods
          const method = request.method as keyof typeof handler
          const method_handler = method ? handler[method] : undefined
          if (method_handler) {
            if (typeof method_handler === 'function') {
              const bun_req = request as any
              bun_req.params = params
              bun_req.cookies = new Map()
              return await method_handler(bun_req)
            } else {
              return method_handler
            }
          }
        }
      }
    }

    return new Response('Not Found', { status: 404 })
  }

  /**
   * Stop the server and release resources.
   */
  async close(): Promise<void> {
    if (this.bun_server) {
      await this.bun_server.stop()
      console.log('🛑 Server stopped')
    }
  }
}

/**
 * Factory function to create a new server instance.
 * @param config - Server configuration
 * @returns New server instance
 */
export function create_server(config: ServerConfig): Server {
  return new ServerImpl(config)
}
