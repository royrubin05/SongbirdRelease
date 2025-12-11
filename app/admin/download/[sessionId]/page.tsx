
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import DownloadClient from './download-client';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default async function DownloadPage({ params }: PageProps) {
    const { sessionId } = await params;

    const session = await prisma.signingSession.findUnique({
        where: { id: sessionId }
    });

    if (!session) {
        notFound();
    }

    const name = session.designatedName || session.description || 'Client';
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    const filename = `Waiver_${sanitizedName}.pdf`;
    // New Flat URL Structure: /api/document/[filename]?sessionId=[id]
    // This ensures browser sees [filename] as the direct resource
    const apiPath = `/api/document/${encodeURIComponent(filename)}?sessionId=${session.id}`;

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-[#E6DCC3] max-w-md w-full text-center space-y-6">
                {/* Logo */}
                <img src="/logo.png" alt="Songbird Terrace" className="h-16 w-auto mx-auto object-contain" />

                <div className="space-y-2">
                    <h1 className="text-2xl font-serif text-[#2C1810] font-bold">Waiver Ready</h1>
                    <p className="text-[#8B5E3C] text-sm">
                        Preparing download for <span className="font-bold">{name}</span>...
                    </p>
                </div>

                {/* Client Component handles the auto-download and button interaction */}
                <DownloadClient
                    filename={filename}
                    apiPath={apiPath}
                />

                <div className="pt-4 border-t border-[#F5F0E6]">
                    <p className="text-xs text-[#9C8C74]">
                        You can close this tab after the download starts.
                    </p>
                </div>
            </div>
        </div>
    );
}
