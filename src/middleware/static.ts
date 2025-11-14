import { join, normalize } from 'node:path';
import type { Middleware } from '../types';

/**
 * Static file serving middleware configuration options.
 */
export interface StaticOptions {
  /** Root directory to serve files from */
  root: string;
  /** URL prefix to strip before looking up files (default: '') */
  prefix?: string;
  /** Cache-Control header duration (e.g., '1h', '30d', '7d') */
  cache?: string;
  /** Index file to serve for directory requests (default: 'index.html') */
  index?: string;
}

/**
 * Common MIME types for file extensions.
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

/**
 * Convert cache duration string to seconds.
 * @param duration - Duration string like '1h', '30d', '7d'
 * @returns Duration in seconds
 */
function parse_cache_duration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const [, value, unit] = match;
  const num = Number.parseInt(value);

  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    case 'd':
      return num * 86400;
    default:
      return 0;
  }
}

/**
 * Get MIME type from file extension.
 * @param filename - File name or path
 * @returns MIME type or 'application/octet-stream' as default
 */
function get_mime_type(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Static file serving middleware for serving files from a directory.
 *
 * Features:
 * - Automatic MIME type detection
 * - Cache-Control headers
 * - Path traversal protection
 * - Directory index file support
 * - Efficient streaming with Bun.file
 *
 * @example
 * ```typescript
 * import { bunserve, router, static_files } from 'bunserve';
 *
 * const app = bunserve({ router: router() });
 *
 * // Serve files from ./public directory
 * app.use(static_files({ root: './public' }));
 *
 * // Serve files with URL prefix
 * app.use(static_files({
 *   root: './assets',
 *   prefix: '/static',
 *   cache: '7d'
 * }));
 *
 * // Custom cache duration
 * app.use(static_files({
 *   root: './uploads',
 *   cache: '1h',
 *   index: 'index.html'
 * }));
 * ```
 */
export function static_files(options: StaticOptions): Middleware {
  const {
    root,
    prefix = '',
    cache,
    index = 'index.html'
  } = options;

  // Normalize root path
  const root_path = normalize(root);

  return async (context, next) => {
    // Only handle GET and HEAD requests
    if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
      return await next();
    }

    // Get URL pathname
    const url = new URL(context.request.url);
    let pathname = url.pathname;

    // Remove prefix if specified
    if (prefix) {
      if (!pathname.startsWith(prefix)) {
        return await next();
      }
      pathname = pathname.slice(prefix.length);
    }

    // Security: Normalize path and prevent traversal
    pathname = normalize(pathname);
    if (pathname.includes('..')) {
      context.set.status = 403;
      return { error: 'Forbidden' };
    }

    // Build file path
    let file_path = join(root_path, pathname);

    // Check if path ends with / or is a directory, try index file
    if (pathname.endsWith('/') || pathname === '') {
      file_path = join(file_path, index);
    }

    try {
      // Try to open file with Bun.file
      const file = Bun.file(file_path);

      // Check if file exists
      if (!(await file.exists())) {
        // If path didn't end with /, try adding index file
        if (!pathname.endsWith('/') && !pathname.includes('.')) {
          const dir_index_path = join(file_path, index);
          const dir_index_file = Bun.file(dir_index_path);
          if (await dir_index_file.exists()) {
            file_path = dir_index_path;
            return serve_file(dir_index_file, file_path, cache, context);
          }
        }

        // File not found, continue to next middleware
        return await next();
      }

      return serve_file(file, file_path, cache, context);
    } catch (_error) {
      // Error reading file, continue to next middleware
      return await next();
    }
  };
}

/**
 * Helper function to serve a file with proper headers.
 */
function serve_file(
  file: ReturnType<typeof Bun.file>,
  file_path: string,
  cache: string | undefined,
  context: any
): Response {
  const mime_type = get_mime_type(file_path);

  const headers: Record<string, string> = {
    'Content-Type': mime_type
  };

  // Add cache header if specified
  if (cache) {
    const cache_seconds = parse_cache_duration(cache);
    if (cache_seconds > 0) {
      headers['Cache-Control'] = `public, max-age=${cache_seconds}`;
    }
  }

  return new Response(file, {
    status: 200,
    headers
  });
}
