import { PaymentMethod } from "@prisma/client";
import { env } from "@/lib/env";
import { sendTicketsEmail } from "@/lib/email";

type PendingOrderEmailArgs = {
  orderId: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  visitDate: string;
  totalCents: number;
};

export async function sendPendingOrderEmail(args: PendingOrderEmailArgs) {
  const successUrl = `${env.APP_BASE_URL}/success?orderId=${encodeURIComponent(args.orderId)}`;
  const subject =
    args.paymentMethod === "MANUAL_EFT"
      ? `${env.VENUE_NAME} Booking received - Order ${args.orderId}`
      : `${env.VENUE_NAME} Order received - ${args.orderId}`;

  const intro =
    args.paymentMethod === "MANUAL_EFT"
      ? "We received your manual EFT booking. Your tickets will only be issued after your proof of payment is uploaded and approved."
      : "We received your booking. Payment confirmation is still pending before tickets can be issued.";

  const nextStep =
    args.paymentMethod === "MANUAL_EFT"
      ? `Use Order ID <b>${args.orderId}</b> as your payment reference, then upload your POP here: <a href="${successUrl}">${successUrl}</a>`
      : `Track your order here: <a href="${successUrl}">${successUrl}</a>`;

  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>${env.VENUE_NAME} - Booking received</h2>
      <p>Order ID: <b>${args.orderId}</b></p>
      <p>Visit date: <b>${args.visitDate}</b></p>
      <p>Total: <b>R${(args.totalCents / 100).toFixed(2)}</b></p>
      <p>${intro}</p>
      <p>${nextStep}</p>
      <p>Support (questions only): ${env.SUPPORT_EMAIL}</p>
    </div>
  `;

  try {
    const result = await sendTicketsEmail({
      to: args.customerEmail,
      subject,
      html,
      attachmentName: `order-${args.orderId}.txt`,
      attachmentBytes: new Uint8Array()
    });

    console.info("[orderNotifications] pending order email", {
      orderId: args.orderId,
      to: args.customerEmail,
      emailStatus: result.status,
      emailProvider: result.provider
    });

    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown email error";
    console.error("[orderNotifications] pending order email failed", {
      orderId: args.orderId,
      to: args.customerEmail,
      emailReason: reason
    });
    return { status: "failed" as const, provider: (env.EMAIL_PROVIDER || "smtp").toLowerCase(), reason };
  }
}
