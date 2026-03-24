import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthed } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login + API login endpoints
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  const isProtectedPage = pathname.startsWith("/admin") || pathname === "/scan" || pathname.startsWith("/scan/");

  // Protect admin routes and the gate scanner page
  if (isProtectedPage) {
    const ok = await isAdminRequestAuthed(req);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/scan/:path*"]
};
