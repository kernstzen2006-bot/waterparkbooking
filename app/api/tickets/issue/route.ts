import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueAndSendTicketsForOrder } from "@/lib/orderFulfillment";

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

    const issued = await issueAndSendTicketsForOrder(order.id);

    return NextResponse.json({ ok: true, pdfUrl: issued.pdfUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
