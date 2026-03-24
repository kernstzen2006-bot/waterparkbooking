import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { issueAndSendTicketsForOrder } from "@/lib/orderFulfillment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = Object.fromEntries((await req.formData()).entries());
  const orderId = String(body.orderId || "");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.manualEftPopUrl) return NextResponse.json({ error: "No POP uploaded" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
    await tx.payment.updateMany({
      where: { orderId },
      data: { status: "PAID", method: "MANUAL_EFT", provider: "manual", providerRef: orderId }
    });
  });

  const fulfillment = await issueAndSendTicketsForOrder(orderId);

  console.info("[eft/approve] approved", {
    orderId,
    previousStatus: order.status,
    emailStatus: fulfillment.emailStatus,
    emailProvider: fulfillment.emailProvider
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/eft-approvals");
  revalidatePath(`/admin/orders/${orderId}`);

  const redirectUrl = new URL(`/admin/orders/${orderId}`, env.APP_BASE_URL);
  redirectUrl.searchParams.set("approved", "1");
  redirectUrl.searchParams.set("emailStatus", fulfillment.emailStatus);
  if (fulfillment.emailReason) {
    redirectUrl.searchParams.set("emailReason", fulfillment.emailReason.slice(0, 180));
  }

  return NextResponse.redirect(redirectUrl);
}
