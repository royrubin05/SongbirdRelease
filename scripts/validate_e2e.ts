/**
 * End-to-end validation after the Google OAuth refresh.
 *
 * Exercises the full Drive + Gmail pipeline using the production env
 * values pulled into .env. Does NOT write to the DB — this is a
 * read-only validation. A small test PDF is uploaded to Drive and an
 * email is sent to roy.rubin@gmail.com. Clean up the Drive file and
 * delete the email afterwards if you don't want them sitting there.
 */

// Load .env BEFORE importing lib/drive and lib/email — they capture
// the relevant env vars at module-load time into top-level const's,
// so if dotenv runs after those imports they see undefined.
import 'dotenv/config';
import { google } from 'googleapis';
import { jsPDF } from 'jspdf';
import { sendBackupEmail } from '../lib/email';
import { uploadToDrive } from '../lib/drive';

function makeTestPdf(): Buffer {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('E2E Validation Test', 20, 30);
    doc.setFontSize(10);
    doc.text(
        `Generated at: ${new Date().toISOString()}\n\n` +
        'This is a synthetic test PDF created by scripts/validate_e2e.ts\n' +
        'to verify Google Drive upload and Gmail send still work after\n' +
        'refreshing the GOOGLE_REFRESH_TOKEN.\n\n' +
        'If you received this email and see a matching file in your Drive\n' +
        'SongBird-Waivers folder, both integrations are working correctly.',
        20, 50
    );
    const out = doc.output('arraybuffer');
    return Buffer.from(out);
}

async function driveAuthCheck() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        return { ok: false, reason: 'missing env' };
    }
    try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const res = await drive.about.get({ fields: 'user(emailAddress)' });
        return { ok: true, account: res.data.user?.emailAddress ?? 'unknown' };
    } catch (err) {
        return { ok: false, reason: (err as Error).message };
    }
}

async function main() {
    console.log('=== 1. Google auth sanity check ===');
    const auth = await driveAuthCheck();
    if (!auth.ok) {
        console.error('✗ Google auth failed:', auth.reason);
        process.exit(1);
    }
    console.log(`✓ Authenticated as: ${auth.account}`);

    console.log('\n=== 2. Generate test PDF ===');
    const pdf = makeTestPdf();
    console.log(`✓ Generated ${pdf.length} bytes`);

    console.log('\n=== 3. Upload to Drive ===');
    const filename = `E2E_Test_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    const driveResult = await uploadToDrive(filename, 'application/pdf', pdf);
    console.log(`✓ Drive upload OK`);
    console.log(`  id:          ${driveResult.id}`);
    console.log(`  webViewLink: ${driveResult.webViewLink}`);

    console.log('\n=== 4. Send test email to roy.rubin@gmail.com ===');
    const emailResult = await sendBackupEmail(
        pdf,
        filename,
        'E2E Validation Test',
        'roy.rubin@gmail.com'
    );
    if (!emailResult.success) {
        console.error('✗ Email send failed:', emailResult.error);
        process.exit(1);
    }
    console.log(`✓ Email sent OK (messageId: ${emailResult.messageId})`);

    console.log('\n=== ALL GREEN ===');
    console.log('Check:');
    console.log(`  • Gmail (roy.rubin@gmail.com) inbox for "[Waiver Signed] E2E Validation Test"`);
    console.log(`  • Drive SongBird-Waivers folder for: ${filename}`);
    console.log(`  • Direct link: ${driveResult.webViewLink}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
