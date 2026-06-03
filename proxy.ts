import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

// Protect everything except the public paths.
// withAuth handles redirects to /login when there's no JWT.
export const config = {
  matcher: [
    // Match all paths except those that start with one of these public prefixes,
    // and except Next internals / static assets / PWA assets at the root.
    "/((?!login|api/auth|api/cron|api/setup|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-|apple-icon|public).*)",
  ],
};
