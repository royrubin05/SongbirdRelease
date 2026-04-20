/**
 * Generate a fresh Google OAuth refresh token.
 *
 * The existing scripts/get_refresh_token.ts used a hard-coded auth code
 * that's already been redeemed (auth codes are single-use) and used the
 * deprecated "urn:ietf:wg:oauth:2.0:oob" flow that Google turned off
 * in 2022.
 *
 * This replacement runs a short-lived local HTTP server, opens the
 * Google consent screen in your browser, catches the redirect, exchanges
 * the code, and prints the refresh token.
 *
 * Usage:
 *   1. Make sure GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are in .env
 *      (pull them from Vercel with: `vercel env pull .env --environment=production`)
 *   2. In Google Cloud Console → your OAuth client → Authorized redirect URIs,
 *      add: http://localhost:3939/callback  (if not already there)
 *   3. `npx tsx scripts/refresh_google_token.ts`
 *   4. Complete Google's consent screen in the browser.
 *   5. Copy the printed refresh token, paste into Vercel env GOOGLE_REFRESH_TOKEN,
 *      redeploy.
 *
 * If your OAuth client is a "Desktop app" type in GCP, localhost is already
 * allowed and you skip step 2.
 */

import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = 3939;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// Scopes must cover everything the app does:
//   Drive (upload + list + permissions.create)
//   Gmail (send email)
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/gmail.send',
];

async function main() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error(
            'Missing GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET in .env.\n' +
            'Pull them from Vercel first:\n' +
            '   npx vercel env pull .env --environment=production --yes'
        );
        process.exit(1);
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // forces Google to issue a refresh_token every time
        scope: SCOPES,
    });

    console.log('\n1) Open this URL in your browser (should auto-open):');
    console.log('\n   ' + authUrl + '\n');

    // Try to open the user's default browser.
    const opener =
        process.platform === 'darwin' ? 'open' :
            process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${opener} "${authUrl}"`);

    // Spin up a one-shot HTTP server to catch the ?code=… redirect.
    const code: string = await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            if (!req.url) return;
            const url = new URL(req.url, REDIRECT_URI);
            if (url.pathname !== '/callback') {
                res.writeHead(404); res.end(); return;
            }
            const err = url.searchParams.get('error');
            if (err) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<h1>Google returned an error: ${err}</h1><p>Close this tab and check your terminal.</p>`);
                server.close();
                reject(new Error(err));
                return;
            }
            const c = url.searchParams.get('code');
            if (!c) {
                res.writeHead(400); res.end('No code.'); return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>You can close this tab.</h1><p>Refresh token printed in terminal.</p>');
            server.close();
            resolve(c);
        });
        server.listen(PORT, () => {
            console.log(`2) Waiting for Google redirect to ${REDIRECT_URI}...`);
        });
    });

    console.log('\n3) Exchanging auth code for tokens...');
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
        console.error(
            '\n⚠ Google did not return a refresh_token.\n' +
            'This happens if you previously granted access without revoking it.\n' +
            'Fix: revoke at https://myaccount.google.com/permissions → find this app → remove access,\n' +
            '     then re-run this script.'
        );
        process.exit(1);
    }

    console.log('\n========================================================');
    console.log('NEW REFRESH TOKEN — copy the line below:');
    console.log('========================================================');
    console.log(tokens.refresh_token);
    console.log('========================================================\n');
    console.log('Next steps:');
    console.log('  1) Update Vercel (one-liner, replace <TOKEN>):');
    console.log('     npx vercel env rm GOOGLE_REFRESH_TOKEN production --yes');
    console.log(`     printf '%s' '<TOKEN>' | npx vercel env add GOOGLE_REFRESH_TOKEN production`);
    console.log('  2) Redeploy:');
    console.log('     npx vercel --prod --yes');
    console.log('');
}

main().catch((e) => {
    console.error('Token refresh failed:', e instanceof Error ? e.message : e);
    process.exit(1);
});
