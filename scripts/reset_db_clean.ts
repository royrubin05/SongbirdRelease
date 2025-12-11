
import { prisma } from '../lib/prisma';

async function reset() {
    console.log("Cleaning Database...");
    try {
        await prisma.signedAgreement.deleteMany({});
        await prisma.signingSession.deleteMany({});
        console.log("✅ Database Cleaned (Sessions and Signed Agreements removed).");
    } catch (e) {
        console.error("Cleanup failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

reset();
