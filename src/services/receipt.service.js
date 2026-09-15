import PDFDocument from 'pdfkit';

/**
 * Generates an official branded Swastik Jewellers Digital Installment Receipt PDF
 */
export const generateReceiptPdf = async ({
  receiptId,
  customerName,
  customerPhone,
  chitToken,
  schemeName,
  monthFor,
  amount,
  paymentMethod,
  transactionId,
  goldRateAtPayment,
  goldGrams,
  totalPaidAmount,
  accumulatedGoldGrams,
  paidAt = new Date()
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ---- Brand Header ----
      doc.rect(40, 40, 515, 75).fill('#05241C'); // Deep Emerald brand color
      doc.fillColor('#DFC178').fontSize(22).text('SWASTIK JEWELLERS', 55, 55);
      doc.fillColor('#FFFFFF').fontSize(11).text('KITTY VAULT — OFFICIAL INSTALLMENT RECEIPT', 55, 82);

      // ---- Receipt Metadata ----
      doc.fillColor('#333333').fontSize(10);
      doc.text(`Receipt No: REC-${receiptId}`, 55, 130);
      doc.text(`Date: ${paidAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 380, 130);
      doc.text(`Transaction Ref: ${transactionId}`, 55, 145);
      doc.text(`Payment Mode: ${paymentMethod}`, 380, 145);

      // Divider line
      doc.moveTo(40, 165).lineTo(555, 165).strokeColor('#E2E8F0').stroke();

      // ---- Member & Chit Details ----
      doc.fillColor('#05241C').fontSize(12).text('PATRON & SCHEME DETAILS', 55, 175);
      doc.fillColor('#4A5568').fontSize(10);
      doc.text(`Patron Name: ${customerName}`, 55, 195);
      doc.text(`Contact: ${customerPhone}`, 55, 210);
      doc.text(`Scheme: ${schemeName}`, 300, 195);
      doc.text(`Chit Token: ${chitToken}`, 300, 210);

      // Divider line
      doc.moveTo(40, 230).lineTo(555, 230).strokeColor('#E2E8F0').stroke();

      // ---- Installment Table ----
      doc.rect(40, 240, 515, 25).fill('#F8F9FA');
      doc.fillColor('#1A202C').fontSize(10).text('Installment', 55, 247);
      doc.text('Gold Rate (24K)', 170, 247);
      doc.text('Gold Credited', 310, 247);
      doc.text('Amount Paid', 450, 247);

      doc.fillColor('#2D3748').fontSize(11);
      doc.text(`Month ${monthFor}`, 55, 275);
      doc.text(`Rs. ${goldRateAtPayment.toLocaleString('en-IN')}/g`, 170, 275);
      doc.text(`${goldGrams.toFixed(3)} grams`, 310, 275);
      doc.fillColor('#05241C').fontSize(12).text(`Rs. ${amount.toLocaleString('en-IN')}`, 450, 275);

      // Divider line
      doc.moveTo(40, 305).lineTo(555, 305).strokeColor('#E2E8F0').stroke();

      // ---- Cumulative Summary ----
      doc.rect(40, 315, 515, 60).fill('#F0FDF4');
      doc.fillColor('#166534').fontSize(11).text('CUMULATIVE SCHEME SAVINGS', 55, 325);
      doc.fillColor('#14532D').fontSize(10);
      doc.text(`Total Paid to Date: Rs. ${totalPaidAmount.toLocaleString('en-IN')}`, 55, 345);
      doc.text(`Total 24K Gold Accumulated: ${accumulatedGoldGrams.toFixed(3)} grams`, 300, 345);

      // ---- Footer & Disclaimer ----
      doc.fillColor('#718096').fontSize(8);
      doc.text('Computer-generated electronic receipt issued by Swastik Jewellers under the Kitty Scheme Regulations.', 40, 420);
      doc.text('Authorized Gold Vault Custody • Hallmarked 999 24K Gold • Support: support@swastikjewellers.com', 40, 435);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
