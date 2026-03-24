import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validation";
import { parseDateOnlyFromYYYYMMDD, toYYYYMMDD } from "@/lib/dates";
import { issueAndSendTicketsForOrder } from "@/lib/orderFulfillment";
import { sendPendingOrderEmail } from "@/lib/orderNotifications";
import { getActiveTicketTypes } from "@/lib/ticketTypes";
import { SWIM_ADDON_CENTS } from "@/lib/pricing";
import { PaymentMethod, PaymentStatus, OrderStatus, TicketTypeCode } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { customerEmail, visitDate, paymentMethod, attendees } = parsed.data;
    const vd = parseDateOnlyFromYYYYMMDD(visitDate);

    const types = await getActiveTicketTypes();
    const typeByCode = new Map(types.map((t) => [t.code, t]));

    let subtotal = 0;
    let addOns = 0;

    // Build tickets
    const ticketsData = attendees.map((a) => {
      const tt = typeByCode.get(a.ticketTypeCode as TicketTypeCode);
      if (!tt) throw new Error(`Ticket type not found: ${a.ticketTypeCode}`);

      const base = tt.basePrice;
      const add = a.hasSwimmingPass ? SWIM_ADDON_CENTS : 0;

      subtotal += base;
      addOns += add;

      return {
        ticketTypeId: tt.id,
        visitDate: vd,
        hasSwimmingPass: a.hasSwimmingPass,
        priceBaseCents: base,
        priceAddOnCents: add,
        totalPriceCents: base + add,
        qrNonce: "" // filled on issuance
      };
    });

    const total = subtotal + addOns;

    const orderStatus: OrderStatus =
      paymentMethod === "MANUAL_EFT" ? "PENDING_EFT" : "PENDING_PAYMENT";

    // If Instant EFT is "auto-confirmed" in this skeleton, we mark PAID immediately.
    const shouldAutoConfirm = paymentMethod === "INSTANT_EFT";

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerEmail,
          visitDate: vd,
          status: shouldAutoConfirm ? "PAID" : orderStatus,
          subtotalCents: subtotal,
          addOnsCents: addOns,
          totalCents: total,
          payments: {
            create: {
              method: paymentMethod as PaymentMethod,
              status: shouldAutoConfirm ? "PAID" : "INITIATED",
              amountCents: total,
              provider: "mock",
              providerRef: null
            }
          },
          tickets: {
            create: ticketsData
          }
        }
      });
      return order;
    });

    console.info("[orders/create] created", {
      orderId: created.id,
      paymentMethod,
      status: created.status,
      totalCents: total
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/eft-approvals");
    revalidatePath(`/admin/orders/${created.id}`);

    // If auto-confirmed, issue immediately
    if (created.status === "PAID") {
      const fulfillment = await issueAndSendTicketsForOrder(created.id);
      console.info("[orders/create] fulfillment", {
        orderId: created.id,
        emailStatus: fulfillment.emailStatus,
        emailProvider: fulfillment.emailProvider
      });
    } else {
      await sendPendingOrderEmail({
        orderId: created.id,
        customerEmail,
        paymentMethod,
        visitDate: toYYYYMMDD(vd),
        totalCents: total
      });
    }

    return NextResponse.json({
      orderId: created.id,
      // In real card flow: return checkoutUrl from provider
      checkoutUrl: null
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
