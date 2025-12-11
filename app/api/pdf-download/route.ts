import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const fileData = formData.get('file') as string; // Base64 or string content
        const filename = formData.get('filename') as string || 'Waiver.pdf';

        if (!fileData) {
            return NextResponse.json({ error: 'No file data' }, { status: 400 });
        }

        // Convert base64 to buffer
        // Note: Client should send Data URI or raw base64. 
        // We expect prefix "data:application/pdf;filename=generated.pdf;base64," or just base64?
        // Let's assume client sends strict base64 payload (without prefix) or we strip it.

        let base64Content = fileData;
        if (base64Content.includes('base64,')) {
            base64Content = base64Content.split('base64,')[1];
        }

        const buffer = Buffer.from(base64Content, 'base64');

        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Length', buffer.length.toString());

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });

    } catch (e) {
        console.error("Download error", e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
