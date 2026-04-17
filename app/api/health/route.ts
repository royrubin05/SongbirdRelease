import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Health check used by the GitHub Actions keep-alive cron.
// Runs a real Prisma query so the hit counts as DB activity on
// Supabase (prevents the free-tier project from pausing).
//
// Returns:
//   200 { ok: true, templates: <n>, checkedAt: <iso> }  on success
//   500 { ok: false, error: "..." }                     if the DB is unreachable
//
// 500 on failure is intentional — the cron job will turn red in
// GitHub Actions and email you, so you find out before the 7-day
// pause window closes.

export const dynamic = 'force-dynamic'; // never cache; we want to hit the DB every time

export async function GET() {
    try {
        const templates = await prisma.agreementTemplate.count();
        return NextResponse.json(
            { ok: true, templates, checkedAt: new Date().toISOString() },
            { status: 200 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 }
        );
    }
}
