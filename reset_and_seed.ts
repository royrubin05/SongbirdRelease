import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning database...');
    // Delete in order of constraints
    await prisma.signedAgreement.deleteMany({});
    await prisma.signingSession.deleteMany({});

    // Ensure agreement template exists
    const template = await prisma.agreementTemplate.findFirst();
    if (!template) {
        await prisma.agreementTemplate.create({
            data: {
                name: "Standard Waiver",
                content: "This is a liability release waiver for Songbird Terrace. By signing this, you agree to release us from liability for any accidents or injuries that may occur on the premises.",
                version: 1
            }
        });
        console.log('Created default agreement template.');
    }

    console.log('Seeding one completed waiver...');

    // Create a session
    const session = await prisma.signingSession.create({
        data: {
            designatedName: 'Alice Tester',
            designatedEmail: 'alice@example.com',
            description: 'Test Waiver',
            isSigned: true,
            agreementTemplateId: template ? template.id : 1
        }
    }
    });

// Create the signed agreement
await prisma.signedAgreement.create({
    data: {
        sessionId: session.id,
        customerName: 'Alice Tester',
        customerEmail: 'alice@example.com',
        customerPhone: '(555) 019-2834',
        customerAddress: '42 Wallaby Way, Sydney, NSW',
        // Simple signature (dot)
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        agreementSnapshot: template?.content || "This is a liability release waiver for Songbird Terrace. By signing this, you agree to release us from liability for any accidents or injuries that may occur on the premises.",
        signedAt: new Date(),
    }
});

console.log('Database reset and seeded with 1 completed waiver.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
