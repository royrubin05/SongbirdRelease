
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
// This needs to be an App Password, not the login password
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// The recipient for backups
const BACKUP_RECIPIENT = 'roy.rubin@gmail.com';

export async function sendBackupEmail(
    pdfBuffer: Buffer,
    filename: string,
    signerName: string,
    signerEmail: string
) {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.warn("Skipping Email Backup: Missing GMAIL_USER or GMAIL_APP_PASSWORD");
        return { success: false, error: 'Missing credentials' };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: GMAIL_USER,
                pass: GMAIL_APP_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: `"Songbird Waiver Bot" <${GMAIL_USER}>`,
            to: BACKUP_RECIPIENT,
            subject: `[Waiver Signed] ${signerName}`,
            text: `A new waiver has been signed by ${signerName} (${signerEmail}).\n\nThe PDF is attached to this email.`,
            attachments: [
                {
                    filename: filename,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        console.log("Email Backup Sent:", info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("Email Backup Failed:", error);
        return { success: false, error: error };
    }
}
