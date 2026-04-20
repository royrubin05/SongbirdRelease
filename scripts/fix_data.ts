/**
 * ONE-TIME DATA FIX
 *
 * Follow-up to scripts/recover_historical_waivers.ts. Does two things
 * that couldn't be done cleanly in the first pass:
 *
 *   1. Rewrites AgreementTemplate.content AND every signed row's
 *      agreementSnapshot with a properly paragraph-formatted version
 *      of the Songbird Terrace liability release. The first-pass
 *      extraction preserved PDF word-wrap linebreaks, which the sign
 *      page (whitespace-pre-wrap) renders as literal <br>, producing
 *      chunky mid-sentence breaks.
 *
 *   2. Lists the Google Drive `SongBird-Waivers/waivers/` folder,
 *      matches each Drive file to a SignedAgreement row by the
 *      customer-name filename prefix, and populates pdfUrl with the
 *      Drive webViewLink. That way clicking "Download PDF" in
 *      /admin opens the real signed artifact instead of invoking
 *      /api/stage-waiver to regenerate a signature-less copy.
 *
 * SAFE TO RERUN.
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

// -------------------------------------------------------------------------
// Agreement text, paragraph-formatted. This is the canonical source now;
// if the venue ever amends the terms, edit here and re-run this script.
// -------------------------------------------------------------------------
const AGREEMENT_TEXT = `SONGBIRD TERRACE LLC Limitation of Liability; Assumption of Risk; Indemnification and Legal Action

Client hereby releases, discharges, waives and relinquishes any and all claims, liabilities, damages or losses of any nature whatsoever the Client has, may have against Songbird Terrace LLC and it's subsidiaries, affiliates, owners, servants, landlord, employees, representatives, contractors, agents, or successors and assigns, (hereinafter collectively the "Released") by, of or for any injury, accident, sickness, disease, estray, theft or death to the Horse, or any of Client's horses, whenever or however the same may occur, including, but not limited to any injury, accident, sickness, disease, estray, theft, or death by reason of or caused by, whether in whole or in part, any alleged negligent or grossly negligent act, omission, or conduct, or alleged breach of contract, by or of the Released.

Client assumes all risks of loss and damage for any injury, sickness, disease, estray, theft, of death of and to the Horse, or any of Client's horses. Client further agrees that no bailment is established with respect to the Horse or any of Client's horses, and that in all actions, Client shall have the burden of proof of establishing any claim, liability, damage or loss.

All special, incidental and consequential damages, including, but not limited to, loss income, revenue or profits, are hereby excluded, disclaimed and shall not be awarded or recovered by Client. In no event shall Client's remedies exceed the amount of the fee paid for the serviced complained of.

The Released shall also not be liable for any personal injury or disability which Client or Client's agents, representatives, employees, invitees or family may receive while on Songbird Terrace LLC's premises, which risks and liabilities are hereby assumed by Client. Client agrees not to sue or bring any other legal action against the Released in connection with any claim, liability, damage or loss which is released, discharged, waived, or relinquished by Client hereunder.

Client agrees to defend, indemnify and hold the Released and each of them, harmless from any claim, liability, damage or losses caused or contributed by, whether in whole or in part, the Horse, or any of Client's horses, including, but not limited to, all expenses and attorney's fees incurred by the Released in defending all such claims. This defense, indemnity and hold harmless shall be required regardless of whether any liability, loss, cost, damage or expense is caused or contributed to in part by the Released, or any of them. It is the intention of the parties here to this defense, indemnify and hold harmless does not require payment as condition precedent to recovery by the Released, or any of them.

As a condition precedent to any legal action by Client, Client shall notify Songbird Terrace LLC in writing at least thirty (30) days in advance of initiating any legal action against the Released, or any of them, regarding or concerning, in whole or in part, the Horse, or any of Client's horses, the Agreement or any other claim against the Released. Within twenty (20) days if receiving such notice, Songbird Terrace LLC, or any of the Released, shall be entitled to require that any such action be resolved by submission to binding arbitration before the American Arbitration Association ("AAA"), in accordance with the Rules of the AAA, with such arbitration to take place in Los Angeles County, California. If Songbird Terrace LLC, or any of the Released, elects binding arbitration, both Songbird Terrace LLC and Client to the fullest extent of the law waives trial by jury or by court.

Notwithstanding anything herein to the contrary, any action, proceeding or arbitration against the Released regarding or concerning, in whole or in part, the Horse, or any of Client's horses, this Agreement or any other claim against the Released, or any of them, must be filed with a court of competent subject matter jurisdiction in Los Angeles County, California, or the AAA (Songbird Terrace LLC or any of the Released so elects) no later than one hundred and twenty (120) days from the date of the claimed loss or be forever barred. The prevailing party to any such action, proceeding or arbitration shall be entitled to collect all reasonable attorney's fees and costs, in addition to all other relief, through and including any petitions or appeals.

I affirm and recognize that there are SUBSTANTIAL RISKS involved in horseback riding and equestrian activities which include, but are not limited to, severe injuries, resulting in permanent physical disabilities, bone and joint injuries, muscle strain and muscle injuries, brain injury, neurological damage and death. Horses are unpredictable and they may react to the conduct and actions of other riders and persons. Horses may, without warning, kick, bite, balk, stomp, stumble, rear, bolt, fall down and react to sudden movements, noise, light, vehicles, other animals or objects. Equestrian activities involve equipment that may break, fail or malfunction. Other riders may not control their animals, or ride within their ability, and cause a collision or other unpredictable consequence. Equestrian activities may be conducted in areas which are subject to constant change in condition according to weather, temperature, and natural and man-made changes in the landscape, including the riding ring, where objects are not marked and hazards may not be visible where trails are not groomed, maintained or controlled, where weather is changeable, unpredictable and dangerous, and where lightning, thunder, beehives, streams, creeks, fallen timber, wild animals and other natural hazards and dangers exist.

I affirm and recognize that there are other risks, hazards and dangers that are integral to equestrian activities in a wilderness or outdoor environment. I further affirm that the description of the risks in this document are not complete and that there are other risks, hazards and dangers associated with participating in equestrian activities in an outdoor environment that may be unknown or unanticipated. I expressly acknowledge that INJURIES RECEIVED MAY BE COMPOUNDED OR INCREASED BY NEGLIGENT RESCUE OPERATION OR PROCEDURES and therefore agree that this Release and Waiver of Liability, is intended to be as broad and inclusive as permitted by the laws of the State of California. I agree to release and forever discharge the Released Parties from any claim whatsoever which arises or may hereafter arise on account of any first aid, treatment or service rendered in connection with my participation in the equestrian activities.

I HEREBY agree to indemnify and save and hold harmless the Released Parties and each of them from any lawsuit by myself or by anyone on my behalf, personal representatives, estate, heirs, next of kin or assign arising out of, or related to, horseback riding related activities that I may engage in or any other related equestrian activities for whatever period said activities may continue, whether caused by negligence whether active or passive, of the Released Parties. I agree that I will not make a claim of any kind against the Released Parties as a result of any damage, injury, paralysis or death, or my property and agree to save and hold harmless, indemnify and forever defend the Released Parties as a result of my participation in the equestrian-related activities, as well as expenses and liabilities, including reasonable attorney's fees incurred by the Released Parties resulting from any such claim, action or demand.

I do hereby grant and convey to Songbird Terrace LLC, all right, title and interest in any and all photographic images and video or audio recording made during my participation, including but not limited to, any royalties, proceeds or other benefits derived from such photographs or records. I understand the nature of the equestrian activities, my experience and capabilities and believe that I am qualified, in good health, and in proper physical condition to participate in such activity.

I understand that horse-related activities are inherently dangerous and I expressly assume the risks associated when visiting Songbird Terrace LLC, which is operated on land owned by Pearl Ridge Properties LLC collectively referred to as Songbird Terrace. I expressly assume all risks of visiting Songbird Terrace LLC and engaging in horse-related activities, including the risk that Songbird Terrace LLC and / or its owners, shareholders, partners, officers, directors, employees, contractors or agents (collectively, the "Songbird Terrace LLC Parties") may be negligent. Personal property on the Songbird Terrace LLC premises, including automobiles, is subject to theft, damage or loss. Accordingly, I agree upon behalf of myself, my heirs, guardians and legal representatives, not to sue the Songbird Terrace LLC Parties and I release the Songbird Terrace LLC Parties in connection with any injury or death occurring on Songbird Terrace LLC premises or in connection with any Songbird Terrace LLC activities or in connection with any damage to or loss of personal property.

Waiver of Unknown Claims. I expressly waive any benefits I may have under section 1542 of the California Civil Code relating to the release of unknown claims: "A general release does not extend to claims which the creditor does not know or suspect to exist in his or her favor at the time of executing the release, which if known by him or her, must have materially affected his or her settlement with the debtor."

I HAVE READ THIS CONSENT AND AGREEMENT, RELEASE AND WAIVER OF LIABILITY, ASSUMPTION OF RISK AND INDEMNITY AGREEMENT. I FULLY UNDERSTAND ITS TERMS AND UNDERSTAND THAT I HAVE GIVEN UP SUBSTANTIAL RIGHTS BY AGREEING TO IT. I HAVE AGREED TO THIS RELEASE AND WAIVER OF LIABILITY FREELY AND VOLUNTARILY WITHOUT ANY INDUCEMENT, ASSURANCE OR GUARANTEE BEING MADE TO ME AND INTEND MY SIGNATURE TO BE A COMPLETE AND UNCONDITIONAL RELEASE OF ALL LIABILITY TO THE GREATEST EXTENT ALLOWED BY LAW.`;

// -------------------------------------------------------------------------
// Google Drive: list waivers/ subfolder, return [{ name, webViewLink }]
// -------------------------------------------------------------------------
async function listDriveWaivers() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientId || !clientSecret || !refreshToken || !parentFolderId) {
        throw new Error('Missing GOOGLE_* env vars. Run `vercel env pull .env` first.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Look for a child folder named "waivers" under the main parent folder.
    // User mentioned they "created a new waivers subfolder and updated the
    // pdf waivers there".
    const folders = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = 'waivers' and trashed = false`,
        fields: 'files(id, name)',
    });

    const waiversFolder = folders.data.files?.[0];
    const targetFolderId = waiversFolder?.id || parentFolderId;
    console.log(
        waiversFolder
            ? `Using waivers/ subfolder: ${waiversFolder.id}`
            : `No waivers/ subfolder found, searching main folder ${parentFolderId}`
    );

    const all: { name: string; webViewLink: string }[] = [];
    let pageToken: string | undefined;

    do {
        const res = await drive.files.list({
            q: `'${targetFolderId}' in parents and mimeType = 'application/pdf' and trashed = false`,
            fields: 'nextPageToken, files(id, name, webViewLink)',
            pageSize: 100,
            pageToken,
        });
        for (const f of res.data.files || []) {
            if (f.name && f.webViewLink) all.push({ name: f.name, webViewLink: f.webViewLink });
        }
        pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    return all;
}

// Normalize a name for matching: "Andrea Cristina Brown" -> "andreacristinabrown"
function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function main() {
    // -----------------------------------------------------------------
    // Task 1: rewrite template + every agreementSnapshot with clean text
    // -----------------------------------------------------------------
    const template = await prisma.agreementTemplate.findFirst({
        orderBy: { id: 'asc' },
    });
    if (!template) {
        console.error('No AgreementTemplate row. Run recover_historical_waivers.ts first.');
        process.exit(1);
    }

    const templateUpdated = await prisma.agreementTemplate.update({
        where: { id: template.id },
        data: {
            content: AGREEMENT_TEXT,
            version: template.version + 1,
            name: 'Songbird Terrace Liability Release',
        },
    });
    console.log(
        `✓ AgreementTemplate updated: id=${templateUpdated.id} v${templateUpdated.version} (${AGREEMENT_TEXT.length} chars)`
    );

    const snapshotUpdate = await prisma.signedAgreement.updateMany({
        data: { agreementSnapshot: AGREEMENT_TEXT },
    });
    console.log(`✓ Updated agreementSnapshot on ${snapshotUpdate.count} signed rows`);

    // -----------------------------------------------------------------
    // Task 2: match Drive PDFs to DB rows and populate pdfUrl
    //
    // Soft-fail if Google auth is broken — the text fix above is the
    // more user-visible change and shouldn't be blocked by OAuth.
    // -----------------------------------------------------------------
    console.log('\nListing Drive folder…');
    let driveFiles: { name: string; webViewLink: string }[];
    try {
        driveFiles = await listDriveWaivers();
    } catch (err) {
        const msg = (err as Error).message || String(err);
        const isAuth = /invalid_grant|unauthorized|401/i.test(msg);
        console.error(
            '\n⚠ Drive listing failed' +
            (isAuth
                ? ' (Google OAuth refresh token invalid/expired).\n' +
                '  Fix: re-run `npx tsx scripts/get_refresh_token.ts` locally,\n' +
                '  then update GOOGLE_REFRESH_TOKEN in Vercel and re-run this script.\n'
                : `\n  ${msg}\n`)
        );
        console.log('Skipping pdfUrl matching; text-fix changes above are still applied.');
        return;
    }
    console.log(`Found ${driveFiles.length} PDFs in Drive.`);

    const signedRows = await prisma.signedAgreement.findMany({
        select: { id: true, customerName: true, pdfUrl: true },
    });
    console.log(`${signedRows.length} signed rows to match.`);

    let matched = 0;
    let alreadySet = 0;
    let unmatched: string[] = [];

    for (const row of signedRows) {
        if (row.pdfUrl) {
            alreadySet += 1;
            continue;
        }
        const needle = normalize(row.customerName);
        // Filename convention: Waiver_Firstname_Lastname[_hash].pdf
        // Normalize the file name the same way and check if the customer
        // name appears inside it.
        const hit = driveFiles.find((f) => normalize(f.name).includes(needle));
        if (hit) {
            await prisma.signedAgreement.update({
                where: { id: row.id },
                data: { pdfUrl: hit.webViewLink },
            });
            matched += 1;
            console.log(`  + ${row.customerName} → ${hit.name}`);
        } else {
            unmatched.push(row.customerName);
            console.log(`  ? ${row.customerName} — no Drive match`);
        }
    }

    console.log('\n==== Summary ====');
    console.log(`Template text rewritten, snapshots backfilled on ${snapshotUpdate.count} rows.`);
    console.log(`pdfUrl populated: ${matched} new, ${alreadySet} already set, ${unmatched.length} unmatched.`);
    if (unmatched.length > 0) {
        console.log('Unmatched (will regenerate on download click):');
        for (const n of unmatched) console.log(`  - ${n}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
