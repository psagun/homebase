import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];
const API_ROUTES = ["/api"];
const STATIC_ROUTES = ["/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and static files
  if (
    API_ROUTES.some((r) => pathname.startsWith(r)) ||
    STATIC_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  // Allow public auth pages
  if (PUBLIC_ROUTES.includes(pathname)) {
    // Redirect to dashboard if already logged in
    const token = request.cookies.get("access_token");
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  const token = request.cookies.get("access_token");
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
