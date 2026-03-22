import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadValidatedOrderFromQrToken } from "@/lib/scanOrder";
import { getTodayWristband } from "@/lib/wristbands";
import { toYYYYMMDD } from "@/lib/dates";

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body.token || "");
  const ticketId = String(body.ticketId || "");
  const scannerId = String(body.scannerId || "unknown");
  if (!token || !ticketId) {
    return NextResponse.json({ ok: false, reason: "Missing token or ticketId" }, { status: 400 });
  }

  const validated = await loadValidatedOrderFromQrToken(token);
  if (!validated.ok) {
    await prisma.scanLog.create({ data: { scannerId, result: "INVALID", reason: validated.reason } });
    return NextResponse.json({ ok: false, reason: validated.reason });
  }

  const { order } = validated;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { ticketType: true, order: true },
  });

  if (!ticket || ticket.orderId !== order.id) {
    await prisma.scanLog.create({
      data: { scannerId, result: "INVALID", reason: "Ticket not on this order", orderId: order.id },
    });
    return NextResponse.json({ ok: false, reason: "Ticket not on this order" });
  }

  if (ticket.status === "REFUNDED" || ticket.status === "VOID") {
    const reason = ticket.status === "REFUNDED" ? "Refunded" : "Void";
    await prisma.scanLog.create({
      data: { scannerId, result: "INVALID", reason, ticketId: ticket.id, orderId: order.id },
    });
    return NextResponse.json({ ok: false, reason });
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.ticket.updateMany({
      where: { id: ticket.id, status: "UNUSED" },
      data: { status: "USED", usedAt: now, usedByScannerId: scannerId },
    });

    if (res.count !== 1) {
      const current = await tx.ticket.findUnique({ where: { id: ticket.id } });
      return { ok: false as const, current };
    }

    await tx.scanLog.create({
      data: { scannerId, result: "VALID", ticketId: ticket.id, orderId: order.id },
    });

    return { ok: true as const };
  });

  if (!updated.ok) {
    const usedAt = updated.current?.usedAt ? new Date(updated.current.usedAt).toLocaleString() : "";
    const usedBy = updated.current?.usedByScannerId ?? "";
    const reason = `Already used (${usedAt}) by ${usedBy || "unknown"}`;

    await prisma.scanLog.create({
      data: { scannerId, result: "INVALID", reason, ticketId: ticket.id, orderId: order.id },
    });

    return NextResponse.json({
      ok: false,
      reason: "Already used",
      details: { usedAt, usedBy },
    });
  }

  const wristband = await getTodayWristband(ticket.ticketType.code, ticket.hasSwimmingPass);

  return NextResponse.json({
    ok: true,
    ticket: {
      id: ticket.id,
      orderId: order.id,
      ticketType: ticket.ticketType.code,
      hasSwimmingPass: ticket.hasSwimmingPass,
      visitDate: toYYYYMMDD(ticket.visitDate),
    },
    wristband,
  });
}
