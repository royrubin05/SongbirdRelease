import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from './lib/auth';

/**
 * Protect everything under /admin (pages + per-session download route).
 * /api/stage-waiver returns customer PDFs, so it's gated too.
 *
 * /api/health is intentionally public — the keep-alive cron needs to hit it
 * unauthenticated. /sign/[id] is public (it's the customer-facing flow).
 * /login and its server action are public (obviously).
 */
export async function middleware(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
        const loginUrl = new URL('/login', req.url);
        // Preserve where they were headed so login redirects back post-auth.
        const next = req.nextUrl.pathname + req.nextUrl.search;
        if (next && next !== '/') loginUrl.searchParams.set('next', next);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/stage-waiver/:path*',
    ],
};
