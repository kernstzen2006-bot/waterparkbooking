import { prisma } from "@/lib/prisma";
import { issueTicketsForOrder } from "@/lib/issueTickets";
import { sendTicketsEmail } from "@/lib/email";
import { env } from "@/lib/env";

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

  await sendTicketsEmail({
    to: order.customerEmail,
    subject,
    html,
    attachmentName: `tickets-${order.id}.pdf`,
    attachmentBytes: issued.pdfBytes,
  });

  return issued;
}
