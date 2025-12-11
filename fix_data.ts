import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.signingSession.findMany({
        where: {
            isSigned: true,
            signedAgreement: {
                is: null,
            },
        },
    });

    console.log(`Found ${sessions.length} signed sessions without agreements.`);

    for (const session of sessions) {
        const dummyName = session.designatedName || 'John Doe';
        const dummyEmail = session.designatedEmail || 'john@example.com';

        // Create a dummy signed agreement
        await prisma.signedAgreement.create({
            data: {
                sessionId: session.id,
                customerName: dummyName,
                customerAddress: '123 Dummy St, Testville, TS',
                customerEmail: dummyEmail,
                customerPhone: '(555) 123-4567',
                // Simple 1x1 transparent pixel base64 or a small drawing
                signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                agreementSnapshot: 'This is a dummy agreement snapshot for testing purposes. liability is released.',
                signedAt: new Date(),
            },
        });
        console.log(`Created dummy agreement for session ${session.id}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
