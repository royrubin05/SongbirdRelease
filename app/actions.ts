'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { generateWaiverPDF } from '@/lib/pdf-generator';
import { uploadToDrive } from '@/lib/drive';
import { sendBackupEmail } from '@/lib/email';

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
            description: data.description || `Waiver for ${data.name}`,
            designatedName: data.name,
            designatedEmail: data.email,
            agreementTemplateId: 1 // Default link
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

        // Backups handled below transaction

        // --- Automatic Backup Logic ---
        try {
            // Fetch fresh data with relations for the generator
            const fullSession = await prisma.signingSession.findUnique({
                where: { id: sessionId },
                include: { signedAgreement: true }
            });

            if (fullSession && fullSession.signedAgreement) {
                const pdfBuffer = await generateWaiverPDF(fullSession);
                const safeName = data.name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
                const filename = `Waiver_${safeName}_${sessionId.slice(0, 4)}.pdf`;

                // 1. Try Email Backup (User Priority)
                await sendBackupEmail(
                    pdfBuffer,
                    filename,
                    data.name,
                    data.email
                );

                // 2. Try Drive Backup (Secondary/Legacy - kept for when quotas are fixed)
                try {
                    const driveFile = await uploadToDrive(
                        filename,
                        'application/pdf',
                        pdfBuffer,
                        'SongBird-Waivers'
                    );

                    if (driveFile && driveFile.webViewLink) {
                        await prisma.signedAgreement.update({
                            where: { id: result.id },
                            data: { pdfUrl: driveFile.webViewLink }
                        });
                    }
                } catch (driveError) {
                    console.warn("Drive Backup skipped/failed (using email instead):", driveError);
                }
            }
        } catch (backupError) {
            console.error("Automatic Backup failed:", backupError);
        }

        return { success: true, signedId: result.id };

    } catch (e) {
        console.error(e);
        return { success: false, error: (e as any).message || "Failed to submit" };
    }
}

export async function deleteSigningSession(sessionId: string) {
    try {
        await prisma.$transaction([
            prisma.signedAgreement.deleteMany({
                where: { sessionId }
            }),
            prisma.signingSession.delete({
                where: { id: sessionId }
            })
        ]);
        revalidatePath('/admin');
        return { success: true };
    } catch (e) {
        console.error("Delete failed:", e);
        return { success: false, error: "Failed to delete" };
    }
}
