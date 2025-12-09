/**
 * Next.js Middleware
 * 
 * Security middleware that:
 * 1. Blocks x-middleware-subrequest header to prevent CVE-2025-29927
 * 2. Adds security headers to all responses
 * 3. Can be extended for authentication, rate limiting, etc.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Defense-in-depth: Block the x-middleware-subrequest header
  // This header was used in CVE-2025-29927 to bypass middleware
  // Even though 15.2.3+ is patched, we add this as an extra layer
  const dangerousHeader = request.headers.get("x-middleware-subrequest");
  if (dangerousHeader) {
    console.warn(
      `[Security] Blocked request with x-middleware-subrequest header`
    );
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Continue with the request
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
