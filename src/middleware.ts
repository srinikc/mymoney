import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  const publicRoutes = ["/api/auth", "/api/drive", "/"]
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  if (isPublic) return NextResponse.next()

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return Response.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
