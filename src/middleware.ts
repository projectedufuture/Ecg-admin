import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware: server-side route gate for the (admin) group.
 *
 * The access token lives in memory / sessionStorage, which the Edge runtime
 * cannot see. The backend, however, sets an httpOnly `refreshToken` cookie
 * on login — its presence is a cheap, forgery-resistant signal that the
 * browser has an active session. If it's missing on an admin route, kick
 * the user to /login immediately instead of loading a layout that will
 * redirect them in React.
 *
 * Final JWT validation still happens inside AuthContext + the API layer.
 */

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

// Paths rendered by the `app/(admin)/*` group. Route groups are invisible in
// the URL, so we list the real segments here.
const ADMIN_PATHS = [
  "/dashboard",
  "/users",
  "/sessions",
  "/devices",
  "/licenses",
  "/profile",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const isAdminPath = ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isAdminPath) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get("refreshToken")?.value);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
