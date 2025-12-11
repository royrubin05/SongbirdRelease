import { google } from 'googleapis';
import { Readable } from 'stream';
import { drive_v3 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const FOLDER_NAME = 'SongBird-Waivers';
const FOLDER_ID_ENV = process.env.GOOGLE_DRIVE_FOLDER_ID;

// OAuth Credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

function getAuthClient() {
    // 1. Prioritize OAuth (User Credentials) if available - fixes Quota issues
    if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
        console.log("Using OAuth 2.0 (User Credentials) for Drive Upload");
        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
        return oauth2Client;
    }

    // 2. Fallback to Service Account (Legacy/Server-to-Server)
    console.log("Using Service Account for Drive Upload");
    return new google.auth.GoogleAuth({
        scopes: SCOPES,
    });
}

async function getFolderId(drive: drive_v3.Drive) {
    if (FOLDER_ID_ENV) {
        return FOLDER_ID_ENV;
    }

    // 1. Check if folder exists
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
    }

    // 2. Create if not exists
    console.log(`Folder '${FOLDER_NAME}' not found, creating...`);
    const fileMetadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    return folder.data.id!;
}

export async function uploadToDrive(
    filename: string,
    mimeType: string,
    buffer: Buffer,
    folderName: string = 'SongBird-Waivers'
) {
    try {
        const auth = getAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        // Ensure folder exists (or get ID from env)
        const folderId = await getFolderId(drive);

        const requestBody = {
            name: filename,
            parents: [folderId],
        };

        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        const file = await drive.files.create({
            requestBody,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Make the file publicly viewable (optional, but good for returning a "view" link)
        // With OAuth (Owner), this should work fine.
        await drive.permissions.create({
            fileId: file.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log('File Uploaded to Drive:', file.data.id);
        return file.data;

    } catch (error) {
        console.error('Drive Upload Error:', error);
        throw error;
    }
}
