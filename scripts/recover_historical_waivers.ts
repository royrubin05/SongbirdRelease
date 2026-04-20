/**
 * ONE-TIME RECOVERY SCRIPT
 *
 * Re-seeds Supabase from locally-downloaded historical waiver PDFs
 * (originals stored in Google Drive `SongBird-Waivers/waivers/`).
 *
 * What it does:
 *   1. Extracts the canonical agreement text from the first PDF and
 *      UPDATEs the AgreementTemplate row (was placeholder "Standard
 *      Waiver" after the Supabase rebuild).
 *   2. For each PDF in ../waivers/, parses customer name, email,
 *      phone, address, signed-at timestamp, IP and creates a pair
 *      of SigningSession + SignedAgreement rows.
 *   3. Deletes any test data (e.g. "Alice Tester" seeded by
 *      reset_and_seed.ts) so the admin dashboard shows only real
 *      historical data.
 *
 * What it does NOT do:
 *   - Does not populate signatureData (the rendered signature image
 *     lives inside the PDF; the PDF is the legal artifact).
 *   - Does not populate pdfUrl (the PDFs already exist in Drive, but
 *     matching local files to Drive file IDs would require an extra
 *     Drive-list step with OAuth creds). Left null; the download
 *     button will regenerate-and-upload on first click.
 *
 * SAFE TO RERUN: upserts template, skips sessions that already have a
 * customer + signedAt match within 1 second. So re-running doesn't
 * duplicate rows.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
// pdf-parse v2 exposes a `PDFParse` class (not the v1 callable default).
const require_ = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PDFParse } = require_('pdf-parse') as { PDFParse: any };

async function extractText(buf: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buf });
    try {
        const r = await parser.getText();
        // getText returns { text, pages, ... } — consolidate to plain text.
        return typeof r === 'string' ? r : (r.text ?? r.pages?.map((p: { text: string }) => p.text).join('\n') ?? '');
    } finally {
        await parser.destroy?.();
    }
}

const prisma = new PrismaClient();

// Resolve ../waivers/ relative to repo root
const WAIVERS_DIR = path.resolve(__dirname, '..', 'waivers');

type Parsed = {
    file: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    signedAt: Date;
    ipAddress: string | null;
};

/**
 * Extracts the agreement body text from a PDF string. Between the first
 * occurrence of "Agreement Terms" and the "Signed by ..." page footer.
 */
function extractAgreementText(full: string): string {
    const start = full.indexOf('Agreement Terms');
    const end = full.indexOf('Signed by');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Could not locate Agreement Terms … Signed by section');
    }
    return full
        .slice(start + 'Agreement Terms'.length, end)
        .trim()
        .replace(/\r/g, '')
        // collapse >2 blank lines to exactly 2
        .replace(/\n{3,}/g, '\n\n');
}

function parseOne(file: string, text: string): Parsed {
    // Expected lines (order from the jspdf template):
    //   Signer: <Name>     Date: <M/D/YYYY HH:MM AM/PM>
    //   Email: <email>
    //   Phone: <phone>
    //   Address: <street, city, state>
    //   Digitally signed via Songbird Terrace at <ISO8601>
    //   IP: <dotted quad>
    //
    // pdf-parse usually preserves line breaks, but whitespace within lines
    // can be squeezed, so we're liberal with \s+.

    const match = (re: RegExp, label: string): string => {
        const m = text.match(re);
        if (!m) throw new Error(`${label} not found in ${path.basename(file)}`);
        return m[1].trim();
    };

    const customerName = match(/Signer:\s*(.+?)\s*Date:/s, 'Signer');
    const customerEmail = match(/Email:\s*([^\s\n]+)/, 'Email');
    const customerPhone = match(/Phone:\s*(.+?)(?=\n|Address:)/s, 'Phone');
    const customerAddress = match(/Address:\s*(.+?)(?=\n|Agreement Terms)/s, 'Address');
    const signedAtIso = match(
        /Digitally signed via Songbird Terrace at\s*([0-9T:\-.Z]+)/,
        'Signed timestamp'
    );

    const ipMatch = text.match(/IP:\s*([0-9.]+)/);
    const ipAddress = ipMatch ? ipMatch[1].trim() : null;

    return {
        file,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        signedAt: new Date(signedAtIso),
        ipAddress,
    };
}

async function main() {
    console.log(`Scanning ${WAIVERS_DIR}`);
    const entries = await fs.readdir(WAIVERS_DIR);
    const pdfFiles = entries.filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
    console.log(`Found ${pdfFiles.length} PDFs.`);

    if (pdfFiles.length === 0) {
        console.error('No PDFs to recover. Aborting.');
        process.exit(1);
    }

    const parsed: Parsed[] = [];
    let agreementText = '';

    for (const name of pdfFiles) {
        const full = path.join(WAIVERS_DIR, name);
        const buf = await fs.readFile(full);
        const text = await extractText(buf);

        if (!agreementText) {
            agreementText = extractAgreementText(text);
            console.log(`Extracted agreement text: ${agreementText.length} chars`);
        }

        try {
            const p = parseOne(name, text);
            parsed.push(p);
            console.log(
                `  ✓ ${name} → ${p.customerName} <${p.customerEmail}> @ ${p.signedAt.toISOString()}`
            );
        } catch (err) {
            console.error(`  ✗ ${name}: ${(err as Error).message}`);
        }
    }

    console.log(`\nParsed ${parsed.length}/${pdfFiles.length} PDFs.`);
    if (parsed.length !== pdfFiles.length) {
        console.error('Some PDFs failed to parse — aborting before DB writes.');
        process.exit(1);
    }

    // ------------------------------------------------------------------
    // 1. Update the canonical agreement template with the real text.
    // ------------------------------------------------------------------
    const existing = await prisma.agreementTemplate.findFirst({
        orderBy: { id: 'asc' },
    });

    const template = existing
        ? await prisma.agreementTemplate.update({
            where: { id: existing.id },
            data: {
                name: 'Songbird Terrace Liability Release',
                content: agreementText,
                version: (existing.version ?? 1) + 1,
            },
        })
        : await prisma.agreementTemplate.create({
            data: {
                name: 'Songbird Terrace Liability Release',
                content: agreementText,
                version: 1,
            },
        });

    console.log(
        `\nAgreementTemplate ${existing ? 'updated' : 'created'}: id=${template.id} v${template.version}`
    );

    // ------------------------------------------------------------------
    // 2. Purge obvious test rows before importing real data.
    //    Only removes the Alice Tester seed from reset_and_seed.ts.
    // ------------------------------------------------------------------
    // Find test sessions first (SignedAgreement has FK to SigningSession,
    // so we must delete the agreement rows before the session rows).
    const testSessions = await prisma.signingSession.findMany({
        where: {
            OR: [
                { designatedEmail: 'alice@example.com' },
                { designatedName: 'Alice Tester' },
                { signedAgreement: { customerName: 'Alice Tester' } },
            ],
        },
        select: { id: true },
    });
    if (testSessions.length > 0) {
        const ids = testSessions.map((s) => s.id);
        await prisma.signedAgreement.deleteMany({ where: { sessionId: { in: ids } } });
        const r = await prisma.signingSession.deleteMany({ where: { id: { in: ids } } });
        console.log(`Removed ${r.count} test row(s).`);
    }

    // ------------------------------------------------------------------
    // 3. Insert historical waivers, idempotently.
    // ------------------------------------------------------------------
    let inserted = 0;
    let skipped = 0;

    for (const p of parsed) {
        const lowSecond = new Date(p.signedAt.getTime() - 1000);
        const highSecond = new Date(p.signedAt.getTime() + 1000);

        const dup = await prisma.signedAgreement.findFirst({
            where: {
                customerName: p.customerName,
                signedAt: { gte: lowSecond, lte: highSecond },
            },
        });
        if (dup) {
            console.log(`  ↷ skip (already present): ${p.customerName}`);
            skipped += 1;
            continue;
        }

        await prisma.signingSession.create({
            data: {
                status: 'SIGNED',
                isSigned: true,
                designatedName: p.customerName,
                designatedEmail: p.customerEmail,
                description: 'Historical recovery from Drive PDF archive',
                createdAt: p.signedAt,
                agreementTemplate: { connect: { id: template.id } },
                signedAgreement: {
                    create: {
                        customerName: p.customerName,
                        customerEmail: p.customerEmail,
                        customerPhone: p.customerPhone,
                        customerAddress: p.customerAddress,
                        // Signature image lives inside the Drive PDF; the
                        // DB blob was lost in the previous DB outage.
                        // Empty string is legal here (String! allows '').
                        signatureData: '',
                        // Drive URL left null — will be populated on first
                        // admin download click via /api/stage-waiver flow.
                        pdfUrl: null,
                        pdfPath: null,
                        agreementSnapshot: agreementText,
                        signedAt: p.signedAt,
                    },
                },
            },
        });
        inserted += 1;
        console.log(`  + ${p.customerName}`);
    }

    // ------------------------------------------------------------------
    // 4. Report.
    // ------------------------------------------------------------------
    const counts = {
        templates: await prisma.agreementTemplate.count(),
        sessions: await prisma.signingSession.count(),
        signed: await prisma.signedAgreement.count(),
    };
    console.log('\n==== Recovery summary ====');
    console.log(`Inserted:          ${inserted}`);
    console.log(`Skipped (dupes):   ${skipped}`);
    console.log(`Templates in DB:   ${counts.templates}`);
    console.log(`Sessions in DB:    ${counts.sessions}`);
    console.log(`Signed in DB:      ${counts.signed}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
