/**
 * Admin authentication helpers.
 *
 * Storage model:
 *   - ADMIN_USERS env var: JSON map of { "<email>": "<bcrypt-hash>" }
 *     One shared env var; passwords hashed individually per user.
 *   - AUTH_SECRET env var: random 32+ byte base64 string used to sign
 *     session cookies (HMAC-SHA256 via jose).
 *
 * Session model:
 *   - On successful login we issue a signed JWT cookie `songbird_session`.
 *   - Claims: { sub: email, iat, exp }. 7-day expiry.
 *   - Cookie flags: HttpOnly, Secure, SameSite=Strict.
 *
 * Why JWT + jose + bcryptjs:
 *   - jose is edge-runtime compatible (used by middleware).
 *   - bcryptjs is pure JS (no native bindings) and widely audited.
 *   - Keeps the door open to Edge middleware later if we need it,
 *     though we currently run middleware on Node runtime so bcrypt
 *     isn't exercised there (we only verify JWT signatures in edge).
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'songbird_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET env var is not set');
    return new TextEncoder().encode(secret);
}

function getAdminUsers(): Record<string, string> {
    const raw = process.env.ADMIN_USERS;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            // Normalize email keys to lowercase for case-insensitive match.
            return Object.fromEntries(
                Object.entries(parsed).map(([k, v]) => [k.toLowerCase(), String(v)])
            );
        }
    } catch {
        // Fall through; return empty so login fails closed.
    }
    return {};
}

export async function verifyCredentials(
    email: string,
    password: string
): Promise<{ ok: true; email: string } | { ok: false; reason: 'not_found' | 'bad_password' | 'misconfigured' }> {
    const users = getAdminUsers();
    if (Object.keys(users).length === 0) return { ok: false, reason: 'misconfigured' };

    const normalized = email.trim().toLowerCase();
    const hash = users[normalized];

    // Always run a bcrypt compare to avoid timing leaks on user-not-found.
    const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8wFzL3l0e0e0e0e0e0e0e0e0e0e0e0e';
    const ok = await bcrypt.compare(password, hash || dummyHash);

    if (!hash) return { ok: false, reason: 'not_found' };
    if (!ok) return { ok: false, reason: 'bad_password' };
    return { ok: true, email: normalized };
}

export async function createSessionToken(email: string): Promise<string> {
    return new SignJWT({ sub: email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .setSubject(email)
        .sign(getSecret());
}

export async function verifySessionToken(
    token: string | undefined | null
): Promise<{ email: string } | null> {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
        if (typeof payload.sub !== 'string') return null;
        return { email: payload.sub };
    } catch {
        return null;
    }
}

export const SESSION_COOKIE_OPTIONS = {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
};
