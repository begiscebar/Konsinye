import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROLE_PREFIX: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  DISPATCHER: "/dispatcher",
  TRUCK_OWNER: "/owner",
  DRIVER: "/driver",
  BROKER: "/broker",
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    if (!token) return NextResponse.next();

    const role = token.role as string;
    const allowedPrefix = ROLE_PREFIX[role];

    const isProtected = Object.values(ROLE_PREFIX).some((p) => path.startsWith(p));
    if (isProtected && allowedPrefix && !path.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(allowedPrefix, req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/dispatcher/:path*", "/owner/:path*", "/driver/:path*", "/broker/:path*"],
};
