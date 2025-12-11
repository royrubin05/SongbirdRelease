
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Re-using the same redirect URI
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

// ADDING GMAIL SCOPE HERE
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/gmail.send'
];

async function getAccessToken() {
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('--- UPGRADE AUTHORIZATION ---');
    console.log('To enable "Password-less" Email, we just need to authorize Gmail access.');
    console.log('Please visit this url:');
    console.log(authUrl);
    console.log('-----------------------------');
    console.log('Paste the new code here.');
}

getAccessToken();
