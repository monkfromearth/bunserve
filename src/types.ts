/**
 * Extract route parameters from a path pattern using TypeScript generics.
 * @template TPath - The path pattern with parameter placeholders
 * @example
 * type Params = RouteParams<'/users/:id/posts/:postId'>
 * // Result: { id: string; postId: string }
 */
export type RouteParams<TPath extends string> =
  TPath extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof RouteParams<Rest>]: string }
    : TPath extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : TPath extends `${string}*${infer _Rest}`
        ? { '*': string }
        : {}

/**
 * Extended Request interface that matches Bun's BunRequest.
 * This includes native parameter extraction and cookie management.
 */
export interface BunRequest<TPath extends string = string> extends Request {
  /** Route parameters extracted by Bun's native router */
  params: RouteParams<TPath>
  /** Cookie management using Bun's CookieMap */
  readonly cookies: CookieMap
}

/**
 * Bun's native CookieMap interface for cookie management.
 */
export interface CookieMap extends Map<string, string> {
  /** Set a cookie with options */
  set(name: string, value: string, options?: CookieOptions): this
  /** Delete a cookie */
  delete(name: string, options?: Pick<CookieOptions, 'domain' | 'path'>): boolean
}

/**
 * Cookie options for Bun's cookie API.
 */
export interface CookieOptions {
  /** Domain scope */
  domain?: string
  /** Expiration date */
  expires?: Date
  /** HTTP-only flag */
  httpOnly?: boolean
  /** Maximum age in seconds */
  maxAge?: number
  /** Path scope */
  path?: string
  /** Same-site policy */
  sameSite?: 'strict' | 'lax' | 'none' | 'Strict' | 'Lax' | 'None'
  /** Secure flag (HTTPS only) */
  secure?: boolean
}

/**
 * Middleware function type for request processing pipeline.
 * @param context - The route context containing request information
 * @param next - Function to call the next middleware in the chain
 * @returns Promise that resolves when middleware processing is complete, optionally with a result
 */
export type Middleware = (
  context: RouteContext<string>,
  next: () => Promise<void>
) => Promise<void | any> | void | any

/**
 * Route handler function type for processing requests.
 * @template TPath - The path pattern with parameter placeholders
 * @param context - The route context containing request, params, query, body, and response setters
 * @returns The response data or Promise resolving to response data
 */
export type RouteHandler<TPath extends string> = (
  context: RouteContext<TPath>
) => Promise<any> | any

/**
 * Route context interface providing access to request information and response configuration.
 * @template TPath - The path pattern with parameter placeholders
 */
export interface RouteContext<TPath extends string> {
  /** The BunRequest object with native params and cookies */
  request: BunRequest<TPath>
  /** Extracted route parameters from URL path (shorthand for request.params) */
  params: RouteParams<TPath>
  /** Parsed query parameters from URL search string */
  query: Record<string, string>
  /** Parsed request body (null for GET/HEAD requests) */
  body: any
  /** Cookie management (shorthand for request.cookies) */
  cookies: CookieMap
  /** Response configuration object for setting status, content type, headers, etc. */
  set: ResponseSetter
}

/**
 * Response setter interface for configuring HTTP responses.
 * Provides control over status codes, content types, headers, and caching.
 * Note: Cookies are managed via request.cookies (Bun's native CookieMap)
 */
export interface ResponseSetter {
  /** HTTP status code (default: 200) */
  status: number
  /** Content type configuration for response formatting */
  content:
    | 'auto'                          // Auto-detect based on result type
    | 'json'                          // JSON response
    | 'text'                          // Plain text
    | 'html'                          // HTML response
    | 'xml'                           // XML response
    | 'png' | 'svg' | 'gif' | 'webp'  // Image types (base64)
    | { type: 'csv'; filename: string } // CSV download
  /** Custom HTTP headers to include in response */
  headers: Record<string, string>
  /** URL for redirect response (triggers redirect when set) */
  redirect?: string
  /** Cache duration (e.g., '1h', '30d', '7d') */
  cache?: string
}

/**
 * Bun's native route handler type.
 * Can be a Response object (static route) or a function returning Response/Promise<Response>.
 */
export type BunRouteHandler<TPath extends string = string> =
  | Response
  | ((req: BunRequest<TPath>) => Response | Promise<Response>)

/**
 * Bun's native route definition with per-HTTP-method handlers.
 */
export type BunRouteDefinition<TPath extends string = string> = {
  GET?: BunRouteHandler<TPath>
  POST?: BunRouteHandler<TPath>
  PUT?: BunRouteHandler<TPath>
  PATCH?: BunRouteHandler<TPath>
  DELETE?: BunRouteHandler<TPath>
  OPTIONS?: BunRouteHandler<TPath>
  HEAD?: BunRouteHandler<TPath>
}

/**
 * Bun's native routes object passed to Bun.serve().
 */
export type BunRoutes = Record<string, BunRouteHandler | BunRouteDefinition>

/**
 * Internal route registration for building Bun routes.
 * @template TPath - The path pattern with parameter placeholders
 */
export interface RouteRegistration<TPath extends string = string> {
  /** HTTP method (GET, POST, etc.) */
  method: string
  /** Route path pattern */
  path: TPath
  /** Route handler function (our API) */
  handler: RouteHandler<TPath>
  /** Route-specific middleware array */
  middlewares: Middleware[]
}

/**
 * Server configuration interface.
 */
export interface ServerConfig {
  /** Router instance for handling requests */
  router: Router
  /** Port number to listen on (default: 3000) */
  port?: number
  /** Host address to bind to (default: 'localhost') */
  host?: string
  /** Optional hook to run before each request */
  before_each?: (request: Request) => Promise<void> | void
}

/**
 * Development server options interface.
 */
export interface DevelopmentOptions {
  /** Whether development features are enabled */
  enabled?: boolean
  /** Hot reload functionality */
  hot_reload?: boolean
  /** Logging configuration */
  logging?: LoggingOptions
  /** CORS support */
  cors?: boolean
}

/**
 * Logging configuration options for development server.
 */
interface LoggingOptions {
  /** Whether logging is enabled */
  enabled?: boolean
  /** Log level threshold */
  level?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Router interface defining the public API for route registration and middleware management.
 */
export interface Router {
  /** Register a GET route */
  get<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register a POST route */
  post<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register a PUT route */
  put<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register a PATCH route */
  patch<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register a DELETE route */
  delete<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register an OPTIONS route */
  options<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register a HEAD route */
  head<Path extends string>(path: Path, handler: RouteHandler<Path>): void
  /** Register a route for all HTTP methods */
  all<Path extends string>(path: Path, handler: RouteHandler<Path>): void

  /** Add global middleware that runs for all routes */
  use(middleware: Middleware): void

  /** Register a POST route with middleware array */
  post<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register a GET route with middleware array */
  get<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register a PUT route with middleware array */
  put<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register a PATCH route with middleware array */
  patch<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register a DELETE route with middleware array */
  delete<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register an OPTIONS route with middleware array */
  options<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register a HEAD route with middleware array */
  head<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /** Register a route for all HTTP methods with middleware array */
  all<Path extends string>(
    path: Path,
    middlewares: Middleware[],
    handler: RouteHandler<Path>
  ): void

  /**
   * Build and return Bun-compatible routes object.
   * This is used internally by the server to pass to Bun.serve().
   * @internal
   */
  build_routes(): BunRoutes
}