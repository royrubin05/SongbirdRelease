'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { loginAction } from './actions';

export default function LoginForm({ next }: { next: string }) {
    const [state, formAction, pending] = useActionState(loginAction, {} as { error?: string });
    const [showPw, setShowPw] = useState(false);

    return (
        <form action={formAction} className="space-y-5">
            <input type="hidden" name="next" value={next} />

            <div>
                <label htmlFor="email" className="field-label">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    autoFocus
                    className="modern-input"
                    placeholder="you@example.com"
                    inputMode="email"
                />
            </div>

            <div>
                <label htmlFor="password" className="field-label">Password</label>
                <div className="relative">
                    <input
                        id="password"
                        name="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="modern-input pr-11"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)] transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {state?.error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 text-sm p-3 rounded-lg border"
                    style={{
                        background: 'var(--danger-soft)',
                        borderColor: 'var(--danger)',
                        color: 'var(--danger)',
                    }}
                >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{state.error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={pending}
                className="btn-primary btn-shine w-full h-11 text-[0.95rem]"
            >
                {pending ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Signing in…
                    </>
                ) : (
                    <>
                        <LogIn className="w-4 h-4" aria-hidden="true" /> Sign In
                    </>
                )}
            </button>
        </form>
    );
}
