
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding sessions...');

    // Create 15 dummy sessions to force pagination (9 per page)
    for (let i = 1; i <= 15; i++) {
        await prisma.signingSession.create({
            data: {
                description: `Group Rider ${i} - Standard Package`,
                isSigned: i % 3 === 0,
                agreementTemplateId: 1, // Default Template
                designatedName: `Rider ${i}`,
                designatedEmail: `rider${i}@test.com`
            }
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
