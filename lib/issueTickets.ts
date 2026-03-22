import { prisma } from "@/lib/prisma";
import { toYYYYMMDD } from "@/lib/dates";
import { makeNonce, signQrPayload } from "@/lib/qr";
import { generateOrderPdfSingleQr } from "@/lib/pdf";
import { uploadBytes, downloadBytes } from "@/lib/storage";

export async function issueTicketsForOrder(orderId: string): Promise<{
  pdfUrl: string;
  pdfStorageKey: string;
  pdfBytes: Uint8Array;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: { include: { ticketType: true } } },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "PAID") throw new Error("Order not paid");

  if (order.pdfUrl && order.pdfStorageKey && order.orderQrNonce) {
    const bytes = await downloadBytes(order.pdfStorageKey);
    return { pdfUrl: order.pdfUrl, pdfStorageKey: order.pdfStorageKey, pdfBytes: bytes };
  }

  const nonce = order.orderQrNonce ?? makeNonce();
  const visitDate = toYYYYMMDD(order.visitDate);
  const qrToken = signQrPayload({
    orderId: order.id,
    visitDate,
    nonce,
    iat: Math.floor(Date.now() / 1000),
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { orderQrNonce: nonce, orderQrIssuedAt: order.orderQrIssuedAt ?? new Date() },
  });

  const lines = order.tickets.map((t) => ({
    ticketTypeLabel: t.ticketType.name,
    ticketTypeCode: t.ticketType.code,
    hasSwimmingPass: t.hasSwimmingPass,
    totalCents: t.totalPriceCents,
  }));

  const pdfBytes = await generateOrderPdfSingleQr({
    orderId: order.id,
    visitDate,
    qrToken,
    lines,
    orderTotalCents: order.totalCents,
  });

  const storageKey = `orders/${order.id}/tickets.pdf`;
  const uploaded = await uploadBytes(storageKey, pdfBytes, "application/pdf");

  await prisma.order.update({
    where: { id: order.id },
    data: { pdfUrl: uploaded.publicUrl, pdfStorageKey: uploaded.key },
  });

  return { pdfUrl: uploaded.publicUrl, pdfStorageKey: uploaded.key, pdfBytes };
}
