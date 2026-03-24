import { NextResponse } from "next/server";
import { TicketTypeCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadValidatedOrderFromQrToken } from "@/lib/scanOrder";
import { getTodayWristband } from "@/lib/wristbands";
import { toYYYYMMDD } from "@/lib/dates";

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body.token || "");
  const scannerId = String(body.scannerId || "unknown");
  if (!token) {
    return NextResponse.json({ ok: false, reason: "Missing token" }, { status: 400 });
  }

  const validated = await loadValidatedOrderFromQrToken(token);
  if (!validated.ok) {
    await prisma.scanLog.create({ data: { scannerId, result: "INVALID", reason: validated.reason } });
    return NextResponse.json({ ok: false, reason: validated.reason });
  }

  const { order } = validated;

  const updated = await prisma.$transaction(async (tx) => {
    const availableTickets = await tx.ticket.findMany({
      where: { orderId: order.id, status: "UNUSED" },
      include: { ticketType: true },
      orderBy: [{ ticketType: { code: "asc" } }, { hasSwimmingPass: "desc" }, { createdAt: "asc" }],
    });

    if (availableTickets.length === 0) {
      return { ok: false as const, reason: "No available tickets left" };
    }

    const ticketIds = availableTickets.map((ticket) => ticket.id);
    const now = new Date();
    const res = await tx.ticket.updateMany({
      where: { id: { in: ticketIds }, status: "UNUSED" },
      data: { status: "USED", usedAt: now, usedByScannerId: scannerId },
    });

    if (res.count !== availableTickets.length) {
      return { ok: false as const, reason: "Order was already processed by another scanner" };
    }

    await tx.scanLog.createMany({
      data: availableTickets.map((ticket) => ({
        scannerId,
        result: "VALID",
        ticketId: ticket.id,
        orderId: order.id,
      })),
    });

    return { ok: true as const, tickets: availableTickets };
  });

  if (!updated.ok) {
    await prisma.scanLog.create({
      data: { scannerId, result: "INVALID", reason: updated.reason, orderId: order.id },
    });

    return NextResponse.json({
      ok: false,
      reason: updated.reason,
    });
  }

  const wristbandMap = new Map<
    string,
    {
      ticketTypeCode: TicketTypeCode;
      ticketTypeName: string;
      hasSwimmingPass: boolean;
      count: number;
    }
  >();

  for (const ticket of updated.tickets) {
    const key = `${ticket.ticketType.code}:${ticket.hasSwimmingPass ? "SWIM" : "NOSWIM"}`;
    const current = wristbandMap.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    wristbandMap.set(key, {
      ticketTypeCode: ticket.ticketType.code,
      ticketTypeName: ticket.ticketType.name,
      hasSwimmingPass: ticket.hasSwimmingPass,
      count: 1,
    });
  }

  const wristbandGroups = await Promise.all(
    [...wristbandMap.values()].map(async (group) => {
      const wristband = await getTodayWristband(group.ticketTypeCode, group.hasSwimmingPass);
      return {
        ...group,
        wristband,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      visitDate: toYYYYMMDD(order.visitDate),
      admittedCount: updated.tickets.length,
    },
    admittedTickets: updated.tickets.map((ticket) => ({
      id: ticket.id,
      ticketTypeCode: ticket.ticketType.code,
      ticketTypeName: ticket.ticketType.name,
      hasSwimmingPass: ticket.hasSwimmingPass,
      visitDate: toYYYYMMDD(ticket.visitDate),
    })),
    wristbandGroups,
  });
}
