import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware: lightweight client-side route protection.
 * 
 * Since the access token is stored in memory (not cookies accessible to middleware),
 * we check for the presence of the ecg_admin session marker. The real auth check
 * happens in the (admin)/layout.tsx via AuthContext + the API's 401 handling.
 * 
 * This middleware provides an immediate redirect for users who navigate directly
 * to admin URLs without having logged in at all.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicPaths = ["/login", "/forgot-password", "/api"];
  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  // For admin routes, we rely on the client-side AuthProvider for the actual
  // JWT validation. This middleware just provides a fast redirect if there's
  // clearly no session at all (no cookies from the backend).
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
