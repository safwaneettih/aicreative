/**
 * Get the appropriate base URL for API calls and static files
 * Works for both localhost and network access
 */
export function getApiBaseUrl(): string {
  const hostname = window.location.hostname;

  // If accessing via localhost or 127.0.0.1, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  // If accessing via network IP (like 192.168.x.x), use the same IP with port 5000
  return `http://${hostname}:5000`;
}

/**
 * Get the API URL for making requests
 */
export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api`;
}

/**
 * Get the full URL for a static file (like videos, voiceovers, etc.)
 */
export function getStaticFileUrl(filePath: string): string {
  return `${getApiBaseUrl()}/${filePath}`;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
