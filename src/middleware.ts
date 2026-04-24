import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Split-deploy note:
 * Frontend lives on Netlify; backend on Render (different origins).
 * The httpOnly `refreshToken` cookie is scoped to the backend origin, so the
 * Netlify edge runtime cannot read it — previous middleware gating therefore
 * bounced every authenticated user back to /login on their first page load.
 *
 * Auth is already enforced client-side in app/(admin)/layout.tsx via
 * AuthProvider, which checks sessionStorage + attempts silent refresh. Keep
 * this middleware as a no-op so page requests flow through to React.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
