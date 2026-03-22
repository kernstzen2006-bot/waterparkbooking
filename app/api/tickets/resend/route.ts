import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTicketsEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { issueTicketsForOrder } from "@/lib/issueTickets";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = req.headers.get("content-type")?.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

    const orderId = String(body.orderId || "");
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // If PDF not issued yet, generate it now (self-heal)
    let pdfUrl = order.pdfUrl || "";
    let pdfBytes: Uint8Array | null = null;

    if (!order.pdfUrl || !order.pdfStorageKey) {
      const issued = await issueTicketsForOrder(order.id);
      pdfUrl = issued.pdfUrl;
      pdfBytes = issued.pdfBytes;
    } else {
      // Already issued; we attach a real PDF by re-issuing fast path (downloads)
      const issued = await issueTicketsForOrder(order.id);
      pdfUrl = issued.pdfUrl;
      pdfBytes = issued.pdfBytes;
    }

    const subject = `${env.VENUE_NAME} Tickets (Resend) - Order ${order.id}`;
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>${env.VENUE_NAME} - Ticket resend</h2>
        <p>Order ID: <b>${order.id}</b></p>
        <p>Your PDF tickets are attached. You can also download here:</p>
        <p><a href="${pdfUrl}">Download tickets</a></p>
        <p>Support (questions only): ${env.SUPPORT_EMAIL}</p>
      </div>
    `;

    await sendTicketsEmail({
      to: order.customerEmail,
      subject,
      html,
      attachmentName: `tickets-${order.id}.pdf`,
      attachmentBytes: pdfBytes ?? new Uint8Array()
    });

    return NextResponse.redirect(`${env.APP_BASE_URL}/admin/orders/${order.id}`);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
