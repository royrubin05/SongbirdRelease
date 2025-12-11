
import { google } from 'googleapis';

const GMAIL_USER = 'roy.rubin@gmail.com';
const BACKUP_RECIPIENT = 'roy.rubin@gmail.com';

function makeBody(to: string, from: string, subject: string, message: string, attachmentCheck: { filename: string, content: Buffer }) {
    const boundary = "foo_bar_baz";

    // Manual MIME Construction
    const str = [
        "MIME-Version: 1.0",
        "to: " + to + ", aarubin@gmail.com",
        "from: " + from,
        "subject: " + subject,
        "Content-Type: multipart/mixed; boundary=" + boundary,
        "",
        "--" + boundary,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        message,
        "",
        "--" + boundary,
        "Content-Type: application/pdf; name=\"" + attachmentCheck.filename + "\"",
        "Content-Disposition: attachment; filename=\"" + attachmentCheck.filename + "\"",
        "Content-Transfer-Encoding: base64",
        "",
        attachmentCheck.content.toString('base64'),
        "",
        "--" + boundary + "--"
    ].join("\r\n");

    return Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendBackupEmail(
    pdfBuffer: Buffer,
    filename: string,
    signerName: string,
    signerEmail: string
) {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        console.warn("Skipping Email Backup: Missing OAuth Credentials");
        return { success: false, error: 'Missing credentials' };
    }

    try {
        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const raw = makeBody(
            BACKUP_RECIPIENT,
            `"Songbird Waiver Bot" <${GMAIL_USER}>`,
            `[Waiver Signed] ${signerName}`,
            `A new waiver has been signed by ${signerName} (${signerEmail}).\n\nThe PDF is attached to this email.`,
            { filename: filename, content: pdfBuffer }
        );

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: raw,
            },
        });

        console.log("Email Backup Sent via Gmail API:", res.data.id);
        return { success: true, messageId: res.data.id };

    } catch (error) {
        console.error("Email Backup Failed:", error);
        return { success: false, error: error };
    }
}

