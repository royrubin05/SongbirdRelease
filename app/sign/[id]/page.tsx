import { prisma } from '@/lib/prisma';
import SigningForm from './signing-form';
import { notFound } from 'next/navigation';

export default async function SigningPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const session = await prisma.signingSession.findUnique({
        where: { id },
        include: { signedAgreement: true }
    });

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-800">
                <div className="max-w-md text-center">
                    <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
                    <p>This signing session does not exist or has expired.</p>
                </div>
            </div>
        );
    }

    if (session.isSigned && session.signedAgreement) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-800">
                <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Agreement Signed</h1>
                    <p className="text-slate-600 mb-6">This agreement was signed by <strong>{session.signedAgreement.customerName}</strong> on {new Date(session.signedAgreement.signedAt).toLocaleDateString()}.</p>
                </div>
            </div>
        );
    }

    // Get latest agreement template
    const agreementTemplate = await prisma.agreementTemplate.findFirst({
        orderBy: { id: 'desc' }
    });

    return (
        <SigningForm
            sessionId={session.id}
            agreementText={agreementTemplate?.content || "No agreement text found."}
            initialData={{
                name: session.designatedName || '',
                email: session.designatedEmail || ''
            }}
        />
    );
}
