import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const query = String(body.query || "").trim();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  // Query can be orderId or ticketId
  const order = await prisma.order.findUnique({
    where: { id: query },
    include: { tickets: { include: { ticketType: true } } }
  });

  if (order) return NextResponse.json({ kind: "order", order });

  const ticket = await prisma.ticket.findUnique({
    where: { id: query },
    include: { ticketType: true, order: true }
  });

  if (ticket) return NextResponse.json({ kind: "ticket", ticket });

  return NextResponse.json({ kind: "none" });
}
