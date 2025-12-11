
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const session = await prisma.signingSession.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (session) {
        console.log(session.id);
    } else {
        console.log('NO_SESSION');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
