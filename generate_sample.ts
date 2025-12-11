import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

// Output path in the artifacts directory
const outputPath = '/Users/royrubin/.gemini/antigravity/brain/ac73221e-051b-4a14-bea7-b132a9406999/Waiver_Alice_Tester.pdf';

const generate = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = 210;
    const maxLineWidth = pageWidth - (margin * 2);

    // Mock Data
    const session = {
        id: '12345678-uuid-test',
        customerName: 'Alice Tester',
        signedAt: new Date(),
        customerEmail: 'alice@example.com',
        customerPhone: '(555) 019-2834',
        customerAddress: '42 Wallaby Way, Sydney, NSW',
        agreementSnapshot: "This is a liability release waiver for Songbird Terrace. By signing this, you agree to release us from liability for any accidents or injuries that may occur on the premises. This agreement is binding and irrevocable. Please read carefully before signing.",
    };

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Liability Release Waiver", 105, 20, { align: "center" });

    // Ref ID
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference: ${session.id.slice(0, 8).toUpperCase()}`, 105, 26, { align: "center" });

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

    addField("Signer:", session.customerName);

    const signedDate = session.signedAt;
    const dateStr = signedDate.toLocaleDateString() + ' ' + signedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addField("Date:", dateStr, 90);

    y += 10;
    addField("Email:", session.customerEmail);
    y += 10;
    addField("Phone:", session.customerPhone);
    y += 10;
    addField("Address:", session.customerAddress);

    // Agreement Text
    y = 90;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Agreement Terms", margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const splitText = doc.splitTextToSize(session.agreementSnapshot, maxLineWidth);

    doc.text(splitText, margin, y);

    // Simulating spacing
    y += (splitText.length * 5) + 20;

    // Signature Line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 80, y);

    // Mock Signature (Text for node demo)
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 200);
    doc.text("Signed", margin + 10, y - 10);
    doc.setTextColor(0);

    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Signed by " + session.customerName, margin, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Digitally signed via Songbird Terrace", margin, y + 5);

    // Set Metadata
    doc.setProperties({
        title: `Waiver_${session.customerName.replace(/ /g, '_')}.pdf`,
        subject: 'Liability Release Waiver',
        author: 'Songbird Terrace',
        creator: 'Songbird Terrace App'
    });

    // Save
    const arrayBuffer = doc.output('arraybuffer');
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    console.log(`Saved PDF to ${outputPath}`);
};

generate();
