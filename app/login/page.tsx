import LoginForm from './login-form';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage(props: {
    searchParams: Promise<{ next?: string }>;
}) {
    // If already logged in, bounce straight to admin.
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (session) redirect('/admin');

    const { next } = await props.searchParams;
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] paper-grain px-4 py-10">
            <div className="max-w-sm w-full">
                <div className="text-center mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.png"
                        alt="Songbird Terrace"
                        className="h-12 w-auto object-contain mx-auto"
                    />
                    <span className="gold-rule" aria-hidden="true" />
                    <h1 className="display-lg mt-4">Admin Sign-In</h1>
                    <p className="eyebrow mt-1.5">Songbird Terrace</p>
                </div>

                <div className="card p-6 md:p-7">
                    <LoginForm next={next || '/admin'} />
                </div>

                <p className="text-center text-[11px] text-[var(--text-subtle)] font-medium mt-6 leading-relaxed px-4">
                    Authorized personnel only. All sign-in attempts are recorded.
                </p>
            </div>
        </div>
    );
}
