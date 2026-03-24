import type { Order, Ticket, TicketType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyQrToken } from "@/lib/qr";
import { parseDateOnlyFromYYYYMMDD, dateOnlyTodayUTC, sameDateOnlyUTC, toYYYYMMDD } from "@/lib/dates";

export type OrderWithTickets = Order & { tickets: (Ticket & { ticketType: TicketType })[] };

export type ScanPreviewGroup = {
  ticketTypeCode: string;
  ticketTypeName: string;
  hasSwimmingPass: boolean;
  total: number;
  used: number;
  remaining: number;
};

export type ScanPreviewAvailableTicket = {
  id: string;
  ticketTypeCode: string;
  ticketTypeName: string;
  hasSwimmingPass: boolean;
  totalPriceCents: number;
};

export async function loadValidatedOrderFromQrToken(
  token: string
): Promise<
  | { ok: true; order: OrderWithTickets; payload: { orderId: string; visitDate: string; nonce: string; iat: number } }
  | { ok: false; reason: string }
> {
  const verified = verifyQrToken(token);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  const payload = verified.payload;

  let tokenVisitDate: Date;
  try {
    tokenVisitDate = parseDateOnlyFromYYYYMMDD(payload.visitDate);
  } catch {
    return { ok: false, reason: "Bad token date" };
  }

  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: { tickets: { include: { ticketType: true } } },
  });

  if (!order) return { ok: false, reason: "Order not found" };

  if (order.orderQrNonce !== payload.nonce) return { ok: false, reason: "Invalid QR" };

  if (order.status !== "PAID") {
    const reason =
      order.status === "PENDING_EFT" || order.status === "EFT_REVIEW" ? "Not paid / EFT pending" : "Not paid";
    return { ok: false, reason };
  }

  const today = dateOnlyTodayUTC();
  if (!sameDateOnlyUTC(order.visitDate, tokenVisitDate)) return { ok: false, reason: "Wrong date" };
  if (!sameDateOnlyUTC(order.visitDate, today)) return { ok: false, reason: "Wrong date" };

  return { ok: true, order, payload };
}

export function buildPreviewPayload(order: OrderWithTickets): {
  visitDate: string;
  groups: ScanPreviewGroup[];
  availableTickets: ScanPreviewAvailableTicket[];
} {
  const visitDate = toYYYYMMDD(order.visitDate);

  const groupMap = new Map<
    string,
    { ticketTypeCode: string; ticketTypeName: string; hasSwimmingPass: boolean; total: number; used: number }
  >();

  for (const t of order.tickets) {
    const key = `${t.ticketType.code}:${t.hasSwimmingPass}`;
    const prev = groupMap.get(key);
    const isUsed = t.status === "USED";
    if (prev) {
      prev.total += 1;
      if (isUsed) prev.used += 1;
    } else {
      groupMap.set(key, {
        ticketTypeCode: t.ticketType.code,
        ticketTypeName: t.ticketType.name,
        hasSwimmingPass: t.hasSwimmingPass,
        total: 1,
        used: isUsed ? 1 : 0,
      });
    }
  }

  const groups: ScanPreviewGroup[] = [...groupMap.values()]
    .map((g) => ({
      ...g,
      remaining: g.total - g.used,
    }))
    .sort((a, b) => {
      if (a.ticketTypeCode !== b.ticketTypeCode) return a.ticketTypeCode.localeCompare(b.ticketTypeCode);
      if (a.hasSwimmingPass === b.hasSwimmingPass) return 0;
      return a.hasSwimmingPass ? -1 : 1;
    });

  const availableTickets: ScanPreviewAvailableTicket[] = order.tickets
    .filter((t) => t.status === "UNUSED")
    .map((t) => ({
      id: t.id,
      ticketTypeCode: t.ticketType.code,
      ticketTypeName: t.ticketType.name,
      hasSwimmingPass: t.hasSwimmingPass,
      totalPriceCents: t.totalPriceCents,
    }))
    .sort((a, b) => {
      if (a.ticketTypeCode !== b.ticketTypeCode) return a.ticketTypeCode.localeCompare(b.ticketTypeCode);
      if (a.hasSwimmingPass !== b.hasSwimmingPass) return a.hasSwimmingPass ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

  return { visitDate, groups, availableTickets };
}
