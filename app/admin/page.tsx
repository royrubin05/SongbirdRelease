import { prisma } from '@/lib/prisma';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    try {
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
    } catch (error: any) {
        console.error("Admin Page Failed:", error);
        return (
            <div className="p-12 text-center font-sans space-y-4">
                <h1 className="text-2xl font-bold text-red-600">Application Error</h1>
                <p className="text-gray-700">The application could not connect to the database.</p>
                <div className="bg-gray-100 p-4 rounded text-left font-mono text-xs overflow-auto max-w-2xl mx-auto">
                    {error.message}
                </div>
                <p className="text-sm text-gray-500">
                    If this is a new deployment, ensure <strong>DATABASE_URL</strong> and <strong>DIRECT_URL</strong> are set in Vercel Settings.
                </p>
                <div className="mt-8">
                    <a href="/debug/env" className="text-blue-600 underline hover:text-blue-800">Check Environment Variables</a>
                </div>
            </div>
        );
    }
}
