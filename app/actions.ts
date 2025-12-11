'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveAgreement(content: string, name: string = "Standard Waiver") {
    await prisma.agreementTemplate.create({
        data: {
            name,
            content
        }
    });
    revalidatePath('/admin');
    return { success: true };
}

export async function createSigningSession(data: { description?: string, name: string, email: string }) {
    const session = await prisma.signingSession.create({
        data: {
            description: data.description,
            designatedName: data.name,
            designatedEmail: data.email
        }
    });
    revalidatePath('/admin');
    return { success: true, id: session.id };
}

export async function submitSignedAgreement(
    sessionId: string,
    data: {
        name: string;
        address: string;
        email: string;
        phone: string;
        signatureData: string;
        agreementSnapshot: string;
    }
) {
    // 1. Mark session as signed
    // 2. Create SignedAgreement record
    // 3. Generate PDF (we might do this in a separate internal API or here if we can run jspdf on server - jspdf is node compatible mostly, or we store the data and let admin generate PDF on demand to avoid complexity?)
    // Requirement: "On submit, system generates a PDF"

    // Implementation: We will save the data first. 
    // PDF generation: We can generate it now or later. 
    // Let's safe the data first.

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // Verify session is valid and not signed
            const session = await tx.signingSession.findUnique({
                where: { id: sessionId }
            });

            if (!session || session.isSigned) {
                throw new Error("Invalid or already signed session");
            }

            await tx.signingSession.update({
                where: { id: sessionId },
                data: { isSigned: true }
            });

            const signed = await tx.signedAgreement.create({
                data: {
                    sessionId,
                    customerName: data.name,
                    customerAddress: data.address,
                    customerEmail: data.email,
                    customerPhone: data.phone,
                    signatureData: data.signatureData,
                    agreementSnapshot: data.agreementSnapshot
                }
            });

            return signed;
        });

        return { success: true, signedId: result.id };

    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to submit" };
    }
}
