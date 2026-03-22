import { PDFDocument, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { formatZar } from "@/lib/money";

export type OrderPdfLine = {
  ticketTypeLabel: string;
  ticketTypeCode: string;
  hasSwimmingPass: boolean;
  totalCents: number;
};

export function generateOrderPdfSingleQr(args: {
  orderId: string;
  visitDate: string;
  qrToken: string;
  lines: OrderPdfLine[];
  orderTotalCents: number;
}): Promise<Uint8Array> {
  return generateOrderPdfInternal(args);
}

async function generateOrderPdfInternal(args: {
  orderId: string;
  visitDate: string;
  qrToken: string;
  lines: OrderPdfLine[];
  orderTotalCents: number;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const margin = 50;
  const leftX = margin;
  let y = height - margin;

  const qrDataUrl = await QRCode.toDataURL(args.qrToken, { margin: 1, width: 220 });
  const qrBase64 = qrDataUrl.split(",")[1];
  if (qrBase64 === undefined) throw new Error("QR data URL missing base64 payload");
  const qrBytes = Uint8Array.from(Buffer.from(qrBase64, "base64"));
  const qrImage = await pdfDoc.embedPng(qrBytes);

  page.drawText(env.VENUE_NAME, {
    x: leftX,
    y: y - 20,
    size: 20,
    font: fontBold,
  });

  y -= 50;

  page.drawText(`Order ID: ${args.orderId}`, { x: leftX, y, size: 12, font: fontRegular });
  y -= 18;
  page.drawText(`Visit date: ${args.visitDate}`, { x: leftX, y, size: 12, font: fontRegular });
  y -= 18;
  page.drawText(`Order total: ${formatZar(args.orderTotalCents)}`, { x: leftX, y, size: 12, font: fontRegular });
  y -= 28;

  page.drawText("Tickets on this order", { x: leftX, y, size: 12, font: fontBold });
  y -= 20;

  for (const line of args.lines) {
    const swim = line.hasSwimmingPass ? " · Swim" : "";
    const text = `${line.ticketTypeLabel} (${line.ticketTypeCode})${swim} — ${formatZar(line.totalCents)}`;
    page.drawText(text, { x: leftX, y, size: 11, font: fontRegular, maxWidth: 420 });
    y -= 16;
  }

  y -= 16;
  const terms =
    "One QR code for your whole party. Show it at the gate. Staff will admit each guest and assign wristbands; " +
    "each entry uses one ticket from your list below.";

  page.drawText(terms, {
    x: leftX,
    y,
    size: 10,
    font: fontRegular,
    maxWidth: 420,
    lineHeight: 12,
  });

  const qrSize = 220;
  const qrX = width - margin - qrSize;
  const qrY = height - margin - 70 - qrSize;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}
