import { prisma } from '@/lib/prisma';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const agreement = await prisma.agreementTemplate.findFirst({
        orderBy: { id: 'desc' }
    });

    const rawSessions = await prisma.signingSession.findMany({
        orderBy: { createdAt: 'desc' },
        include: { signedAgreement: true }
    });

    const sessions = rawSessions.map(session => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        signedAgreement: session.signedAgreement ? {
            ...session.signedAgreement,
            signedAt: session.signedAgreement.signedAt.toISOString()
        } : null
    }));

    return (
        <AdminDashboard
            initialAgreement={agreement?.content || 'Enter liability release text here...'}
            sessions={sessions}
        />
    );
}
