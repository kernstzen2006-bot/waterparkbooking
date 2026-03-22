import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { env } from "@/lib/env";
import { issueAndSendTicketsForOrder } from "@/lib/orderFulfillment";

/**
 * Generic webhook endpoint:
 * Expect JSON:
 * { orderId, providerRef, status: "PAID"|"FAILED", amountCents, signature? }
 *
 * If your provider supports signatures, you can HMAC the raw body with WEBHOOK_HMAC_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Optional signature validation
  if (env.WEBHOOK_HMAC_SECRET && body.signature) {
    const expected = crypto.createHmac("sha256", env.WEBHOOK_HMAC_SECRET).update(raw.replace(/"signature"\s*:\s*".*?"/, '"signature":""')).digest("hex");
    if (expected !== body.signature) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  }

  const { orderId, providerRef, status, amountCents } = body;
  if (!orderId || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isPaidInFull = status === "PAID" && amountCents === order.totalCents;

  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId },
      data: {
        providerRef: providerRef ?? null,
        status: status === "PAID" ? "PAID" : "FAILED",
        rawWebhookJson: body
      }
    });

    if (isPaidInFull) {
      await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
    }
  });

  // Issue tickets on paid
  if (isPaidInFull) {
    await issueAndSendTicketsForOrder(orderId);
  }

  return NextResponse.json({ ok: true });
}
