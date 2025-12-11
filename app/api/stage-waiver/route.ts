import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateWaiverPDF } from '@/lib/pdf-generator';
import { uploadToDrive } from '@/lib/drive';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const sessionId = request.nextUrl.searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing Session ID' }, { status: 400 });
        }

        const session = await prisma.signingSession.findUnique({
            where: { id: sessionId },
            include: { signedAgreement: true }
        });

        if (!session || !session.signedAgreement) {
            return NextResponse.json({ error: 'Waiver not found or not signed' }, { status: 404 });
        }

        const sa = session.signedAgreement;

        // 1. Check if we already have a Drive Link
        if (sa.pdfUrl) {
            return NextResponse.json({
                success: true,
                url: sa.pdfUrl,
                filename: `Waiver_Cached.pdf` // Frontend opens URL directly anyway
            });
        }

        // 2. Generate PDF using shared logic
        const pdfBuffer = await generateWaiverPDF(session);

        // 3. Upload
        const safeName = sa.customerName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const filename = `Waiver_${safeName}.pdf`;

        const driveFile = await uploadToDrive(
            filename,
            'application/pdf',
            pdfBuffer,
            'SongBird-Waivers'
        );

        // 4. Save link for future (Self-Repair)
        if (driveFile.webViewLink) {
            await prisma.signedAgreement.update({
                where: { id: sa.id },
                data: { pdfUrl: driveFile.webViewLink }
            });
        }

        return NextResponse.json({
            success: true,
            url: driveFile.webViewLink,
            filename
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate waiver' }, { status: 500 });
    }
}
