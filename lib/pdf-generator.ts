
import { jsPDF } from 'jspdf';
import { Buffer } from 'buffer';

export async function generateWaiverPDF(session: any): Promise<Buffer> {
    const sa = session.signedAgreement;
    if (!sa) throw new Error("No signed agreement found");

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = 210;
    const maxLineWidth = pageWidth - (margin * 2);

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Liability Release Waiver", 105, 20, { align: "center" });

    // Ref ID
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference: ${session.id.slice(0, 8).toUpperCase()} `, 105, 26, { align: "center" });

    // Signer Details Box
    doc.setDrawColor(200);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, 35, maxLineWidth, 45, 'F');
    doc.setTextColor(0);

    let y = 45;
    const addField = (label: string, value: string, xOffset: number = 0) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(label, margin + 5 + xOffset, y);
        doc.setFont("helvetica", "normal");
        const safeValue = value || 'N/A';
        doc.text(safeValue, margin + 35 + xOffset, y);
    };

    addField("Signer:", sa.customerName);

    const signedDate = new Date(sa.signedAt);
    const dateStr = signedDate.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) + ' ' + signedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    addField("Date:", dateStr, 90);

    y += 10;
    addField("Email:", sa.customerEmail || 'N/A');
    y += 10;
    addField("Phone:", sa.customerPhone || 'N/A');
    y += 10;
    addField("Address:", sa.customerAddress);

    // Agreement Text
    y = 90;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Agreement Terms", margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const splitText = doc.splitTextToSize(sa.agreementSnapshot, maxLineWidth);

    // Pagination loop
    const pageHeight = 297;
    const lineHeight = 5;

    for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
        }
        doc.text(splitText[i], margin, y);
        y += lineHeight;
    }

    // Signature Area - Force new page as requested to avoid overlap
    doc.addPage();
    y = 30;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 80, y);

    if (sa.signatureData) {
        try {
            let imgData = sa.signatureData;
            if (imgData.includes('base64,')) {
                imgData = imgData.split('base64,')[1];
            }
            doc.addImage(imgData, 'PNG', margin, y - 25, 50, 25);
        } catch (imgError) {
            console.error('Error adding signature image:', imgError);
            doc.text("[Signature Error]", margin, y - 5);
        }
    }

    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Signed by " + sa.customerName, margin, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Digitally signed via Songbird Terrace", margin, y + 5);

    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
}
