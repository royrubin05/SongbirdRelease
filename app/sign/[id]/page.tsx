import { prisma } from '@/lib/prisma';
import SigningForm from './signing-form';
import { Check, FileQuestion } from 'lucide-react';

export default async function SigningPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const session = await prisma.signingSession.findUnique({
        where: { id },
        include: { signedAgreement: true },
    });

    if (!session) {
        return <StatusScreen variant="not-found" />;
    }

    if (session.isSigned && session.signedAgreement) {
        return (
            <StatusScreen
                variant="signed"
                name={session.signedAgreement.customerName}
                date={session.signedAgreement.signedAt}
            />
        );
    }

    const agreementTemplate = await prisma.agreementTemplate.findFirst({
        orderBy: { id: 'desc' },
    });

    return (
        <SigningForm
            sessionId={session.id}
            agreementText={agreementTemplate?.content || 'No agreement text found.'}
            initialData={{
                name: session.designatedName || '',
                email: session.designatedEmail || '',
            }}
        />
    );
}

function StatusScreen({
    variant,
    name,
    date,
}: {
    variant: 'signed' | 'not-found';
    name?: string;
    date?: Date;
}) {
    const isSigned = variant === 'signed';

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] paper-grain px-4 py-10">
            <div className="max-w-md w-full text-center">
                {/* Masthead */}
                <div className="mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.png"
                        alt="Songbird Terrace"
                        className="h-12 w-auto object-contain mx-auto"
                    />
                    <span className="gold-rule" aria-hidden="true" />
                </div>

                <div className="card p-8 md:p-10">
                    <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${isSigned
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : 'bg-[var(--gold-soft)] text-[var(--accent-strong)]'
                            }`}
                        style={{ boxShadow: 'var(--shadow-sm)' }}
                        aria-hidden="true"
                    >
                        {isSigned ? <Check className="w-8 h-8" strokeWidth={2.5} /> : <FileQuestion className="w-8 h-8" />}
                    </div>

                    <h1 className="display-lg mb-2">
                        {isSigned ? 'Release Signed' : 'Session Not Found'}
                    </h1>

                    {isSigned ? (
                        <p className="text-sm text-[var(--text-soft)] leading-relaxed">
                            Thank you, <strong className="text-[var(--text)]">{name}</strong>.
                            <br className="hidden sm:block" />
                            Your liability release was completed on{' '}
                            <span className="font-display italic">
                                {date
                                    ? new Date(date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })
                                    : 'record'}
                            </span>
                            .
                        </p>
                    ) : (
                        <p className="text-sm text-[var(--text-soft)] leading-relaxed">
                            This signing session doesn&apos;t exist or has expired. If you believe this is an error,
                            please contact the Songbird Terrace team for a new link.
                        </p>
                    )}
                </div>

                <p className="eyebrow mt-6">Songbird Terrace</p>
            </div>
        </div>
    );
}
