
// @ts-nocheck
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();
const sqlite = new Database(path.join(process.cwd(), 'prisma/dev.db'), { readonly: true });

const parseDate = (d: any) => {
    if (!d) return new Date();
    if (d instanceof Date) return d;
    // Handle integer timestamps (SQLite often stores seconds or ms)
    if (typeof d === 'number') {
        // Guess if seconds or ms based on magnitude (year 2000 is ~9.4e8 seconds, ~9.4e11 ms)
        if (d < 1e11) return new Date(d * 1000);
        return new Date(d);
    }
    return new Date(d);
};

async function migrate() {
    console.log('Starting migration from SQLite to Supabase...');

    // 1. Migrate AgreementTemplates
    console.log('Migrating AgreementTemplates...');
    const templates = sqlite.prepare('SELECT * FROM AgreementTemplate').all() as any[];
    for (const t of templates) {
        await prisma.agreementTemplate.upsert({
            where: { id: t.id },
            update: {
                name: t.name || 'Untitled Template',
                content: t.content || '',
                createdAt: parseDate(t.createdAt),
                updatedAt: parseDate(t.updatedAt)
            },
            create: {
                id: t.id,
                name: t.name || 'Untitled Template',
                content: t.content || '',
                createdAt: parseDate(t.createdAt),
                updatedAt: parseDate(t.updatedAt)
            }
        });
    }
    console.log(`Migrated ${templates.length} templates.`);

    // 2. Migrate SigningSessions
    console.log('Migrating SigningSessions...');
    const sessions = sqlite.prepare('SELECT * FROM SigningSession').all() as any[];
    for (const s of sessions) {
        await prisma.signingSession.upsert({
            where: { id: s.id },
            update: {
                agreementTemplateId: s.agreementTemplateId || 1,
                status: s.status || 'CREATED',
                description: s.description || null,
                designatedName: s.designatedName || null,
                designatedEmail: s.designatedEmail || null,
                createdAt: parseDate(s.createdAt),
                updatedAt: parseDate(s.updatedAt)
            },
            create: {
                id: s.id,
                agreementTemplateId: s.agreementTemplateId || 1,
                status: s.status || 'CREATED',
                description: s.description || null,
                designatedName: s.designatedName || null,
                designatedEmail: s.designatedEmail || null,
                createdAt: parseDate(s.createdAt),
                updatedAt: parseDate(s.updatedAt)
            }
        });
    }
    console.log(`Migrated ${sessions.length} sessions.`);

    // 3. Migrate SignedAgreements
    console.log('Migrating SignedAgreements...');
    const agreements = sqlite.prepare('SELECT * FROM SignedAgreement').all() as any[];
    for (const a of agreements) {
        await prisma.signedAgreement.upsert({
            where: { id: a.id },
            update: {
                sessionId: a.signingSessionId || a.sessionId,
                agreementSnapshot: a.agreementSnapshot || '',
                customerName: a.customerName || 'Unknown Signer',
                customerEmail: a.customerEmail || null,
                customerPhone: a.customerPhone || null,
                customerAddress: a.customerAddress || '',
                signatureData: a.signatureData || null,
                signedAt: parseDate(a.signedAt)
            },
            create: {
                id: a.id,
                sessionId: a.signingSessionId || a.sessionId,
                agreementSnapshot: a.agreementSnapshot || '',
                customerName: a.customerName || 'Unknown Signer',
                customerEmail: a.customerEmail || null,
                customerPhone: a.customerPhone || null,
                customerAddress: a.customerAddress || '',
                signatureData: a.signatureData || null,
                signedAt: parseDate(a.signedAt)
            }
        });
    }

    console.log(`Migrated ${agreements.length} signed agreements.`);

    console.log('Migration Complete!');
}

migrate()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        sqlite.close();
    });
