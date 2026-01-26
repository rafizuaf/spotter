/**
 * Security Utilities for Edge Functions
 * 
 * Provides security headers and utilities
 */

/**
 * Get security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
  };
}

/**
 * Combine CORS and security headers
 */
export function getResponseHeaders(corsHeaders: Record<string, string>): Record<string, string> {
  return {
    ...corsHeaders,
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
  };
}
