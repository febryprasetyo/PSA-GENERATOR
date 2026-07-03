import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("psa_session")?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/login", "/viewer/login"];

  // If user is not logged in and tries to access a protected route
  if (!token && !publicRoutes.includes(pathname)) {
    // Redirect /viewer to /viewer/login, and everything else to /login
    const loginUrl = new URL(pathname === "/viewer" ? "/viewer/login" : "/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and tries to access a login page
  if (token && publicRoutes.includes(pathname)) {
    const homeUrl = new URL(pathname === "/viewer/login" ? "/viewer" : "/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image files (png, svg, jpg, jpeg, gif, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
