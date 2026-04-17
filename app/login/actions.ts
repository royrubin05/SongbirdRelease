'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    verifyCredentials,
    createSessionToken,
    SESSION_COOKIE_OPTIONS,
} from '@/lib/auth';

type LoginState = { error?: string; ok?: boolean };

export async function loginAction(
    _prev: LoginState,
    formData: FormData
): Promise<LoginState> {
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const next = String(formData.get('next') || '/admin');

    if (!email || !password) {
        return { error: 'Enter your email and password.' };
    }

    // Rate-limit friendly: no branching error messages between "user not found"
    // and "bad password" — both surface the same text.
    const result = await verifyCredentials(email, password);
    if (!result.ok) {
        if (result.reason === 'misconfigured') {
            return { error: 'Auth is not configured. Contact site administrator.' };
        }
        return { error: 'Incorrect email or password.' };
    }

    const token = await createSessionToken(result.email);
    const store = await cookies();
    store.set({ ...SESSION_COOKIE_OPTIONS, value: token });

    // Only redirect to same-origin safe paths.
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
    redirect(safeNext);
}

export async function logoutAction() {
    const store = await cookies();
    store.set({ ...SESSION_COOKIE_OPTIONS, value: '', maxAge: 0 });
    redirect('/login');
}
