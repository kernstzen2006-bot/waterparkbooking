import { prisma } from "@/lib/prisma";
import { issueTicketsForOrder } from "@/lib/issueTickets";
import { sendTicketsEmail } from "@/lib/email";
import { env } from "@/lib/env";

export type FulfillmentResult = Awaited<ReturnType<typeof issueTicketsForOrder>> & {
  emailStatus: "sent" | "skipped" | "failed";
  emailProvider: string;
  emailReason: string | null;
};

export async function issueAndSendTicketsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerEmail: true,
      status: true,
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "PAID") throw new Error("Order not paid");

  const issued = await issueTicketsForOrder(order.id);

  const subject = `${env.VENUE_NAME} Tickets - Order ${order.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>${env.VENUE_NAME} - Your Tickets</h2>
      <p>Order ID: <b>${order.id}</b></p>
      <p>Your PDF tickets are attached. You can also download here:</p>
      <p><a href="${issued.pdfUrl}">Download tickets</a></p>
      <p>Support (questions only): ${env.SUPPORT_EMAIL}</p>
    </div>
  `;

  try {
    const emailResult = await sendTicketsEmail({
      to: order.customerEmail,
      subject,
      html,
      attachmentName: `tickets-${order.id}.pdf`,
      attachmentBytes: issued.pdfBytes,
    });

    console.info("[fulfillment] completed", {
      orderId: order.id,
      to: order.customerEmail,
      emailStatus: emailResult.status,
      emailProvider: emailResult.provider,
      emailReason: emailResult.status === "skipped" ? emailResult.reason : null,
      pdfUrl: issued.pdfUrl,
    });

    return {
      ...issued,
      emailStatus: emailResult.status,
      emailProvider: emailResult.provider,
      emailReason: emailResult.status === "skipped" ? emailResult.reason : null,
    } satisfies FulfillmentResult;
  } catch (error) {
    const emailReason = error instanceof Error ? error.message : "Unknown email error";
    console.error("[fulfillment] email failed", {
      orderId: order.id,
      to: order.customerEmail,
      emailProvider: (env.EMAIL_PROVIDER || "smtp").toLowerCase(),
      emailReason,
      pdfUrl: issued.pdfUrl,
    });

    return {
      ...issued,
      emailStatus: "failed",
      emailProvider: (env.EMAIL_PROVIDER || "smtp").toLowerCase(),
      emailReason,
    } satisfies FulfillmentResult;
  }
}
