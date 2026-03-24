import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPreviewPayload, loadValidatedOrderFromQrToken } from "@/lib/scanOrder";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const token = String(body.token || "");
  const scannerId = String(body.scannerId || "unknown");
  if (!token) return NextResponse.json({ ok: false, reason: "Missing token" }, { status: 400 });

  const validated = await loadValidatedOrderFromQrToken(token);
  if (!validated.ok) {
    await prisma.scanLog.create({ data: { scannerId, result: "INVALID", reason: validated.reason } });
    return NextResponse.json({ ok: false, reason: validated.reason });
  }

  const { order } = validated;
  const preview = buildPreviewPayload(order);

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      customerEmail: order.customerEmail,
      visitDate: preview.visitDate,
    },
    groups: preview.groups,
    availableTickets: preview.availableTickets,
  });
}
