import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminPassword } from "@/lib/supabase/env";
import { verifySessionToken } from "@/lib/admin/session";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const password = getAdminPassword();
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (password && verifySessionToken(token, password)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  if (pathname !== "/admin/login") {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
