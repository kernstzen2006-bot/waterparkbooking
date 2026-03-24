import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { issueTicketsForOrder } from "@/lib/issueTickets";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());

    const orderId = String(body.orderId || "");
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "PAID") return NextResponse.json({ error: "Order not paid" }, { status: 400 });

    const issued = await issueTicketsForOrder(order.id);

    console.info("[tickets/issue] rebuilt", {
      orderId: order.id,
      pdfUrl: issued.pdfUrl
    });

    revalidatePath(`/admin/orders/${order.id}`);

    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: true, pdfUrl: issued.pdfUrl });
    }

    return NextResponse.redirect(`${env.APP_BASE_URL}/admin/orders/${order.id}?reissued=1`);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
