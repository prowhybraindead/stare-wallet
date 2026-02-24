import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware runs on Edge Runtime - only check cookies/headers
// Full auth check is done in Server Components via Firebase Admin
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const sessionCookie = req.cookies.get("session")?.value

  const publicPaths = ["/login", "/register"]
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!sessionCookie && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (sessionCookie && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\..*).*)"],
}
