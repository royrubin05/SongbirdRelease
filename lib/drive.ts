import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function getFolderId(drive: any, folderName: string): Promise<string> {
    // 1. Check if folder exists
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id, name)',
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    // 2. Create if not exists
    console.log(`Folder '${folderName}' not found, creating...`);
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    // IMPORTANT: Share this new folder with the user? 
    // The service account creates it, so ONLY the service account can see it unless shared.
    // For now, we assume the user pre-created it and shared it. 
    // If we create it, the user won't see it easily. 
    // So we just return the ID.

    return folder.data.id;
}

export async function uploadToDrive(
    filename: string,
    mimeType: string,
    buffer: Buffer,
    folderName: string = 'SongBird-Waivers'
) {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('Missing Google Credentials');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });

    // Find or Get Folder ID
    const folderId = await getFolderId(drive, folderName);

    const fileMetadata = {
        name: filename,
        parents: [folderId],
    };

    const media = {
        mimeType: mimeType,
        body: Readable.from(buffer),
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
    });

    // Make the file publicly viewable (optional, but good for returning a "view" link)
    await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    return response.data;
}
