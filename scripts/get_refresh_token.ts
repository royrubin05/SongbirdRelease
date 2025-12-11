
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const AUTH_CODE = '4/1ATX87lOIvyIzQGpP3nPk5__lq_85Xej9gQ4usEUT8RsIq5hzfFpvHFTi5Zw';

async function exchangeToken() {
    console.log("Exchanging Code for Tokens...");
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob"
    );

    try {
        const { tokens } = await oauth2Client.getToken(AUTH_CODE);
        console.log('--- REFRESH TOKEN ---');
        console.log(tokens.refresh_token);
        console.log('---------------------');
    } catch (e) {
        console.error("Token Exchange Failed:", e.message);
    }
}

exchangeToken();
