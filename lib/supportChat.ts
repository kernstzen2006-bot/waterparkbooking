import { env } from "@/lib/env";
import { formatZar } from "@/lib/money";
import {
  BIRTHDAY_PARTY_EXTRAS,
  BIRTHDAY_PARTY_OPTIONS,
  SCHOOL_OUTING_OPTIONS,
  SCHOOL_OUTING_SWIM_ADDON_CENTS,
  SWIM_ADDON_CENTS,
  getConfiguredDayVisitorTypes,
} from "@/lib/pricing";
import { getActiveTicketTypes } from "@/lib/ticketTypes";

export type SupportChatRole = "user" | "model";

export type SupportChatMessage = {
  role: SupportChatRole;
  text: string;
};

export async function buildSupportChatInstruction(): Promise<string> {
  const ticketTypes = getConfiguredDayVisitorTypes(await getActiveTicketTypes());
  const ticketLines =
    ticketTypes.length > 0
      ? ticketTypes
          .map((ticketType) => `- ${ticketType.name} (${ticketType.code}): ${formatZar(ticketType.basePrice)}`)
          .join("\n")
      : "- Ticket prices are currently unavailable from the database.";

  const schoolOutingLines = SCHOOL_OUTING_OPTIONS.map(
    (option) => `- ${option.label} (${option.hours}): ${formatZar(option.priceCents)} per person`
  ).join("\n");

  const birthdayLines = BIRTHDAY_PARTY_OPTIONS.map(
    (option) =>
      `- ${option.label}: ${formatZar(option.priceCents)} per child, minimum ${option.minimumChildren} children (${option.description})`
  ).join("\n");

  const birthdayExtraLines = BIRTHDAY_PARTY_EXTRAS.map(
    (extra) => `- ${extra.label}: ${formatZar(extra.priceCents)}`
  ).join("\n");

  const extraContext = env.SUPPORT_CHAT_CONTEXT.trim();
  const extraLines = extraContext ? `\nExtra waterpark details from the owner:\n${extraContext}\n` : "";

  return `
You are the customer support assistant for ${env.VENUE_NAME}.

Your job is to help customers with questions about:
- ticket prices
- booking steps
- visit dates
- payment methods
- proof of payment uploads
- ticket delivery
- QR code entry
- school outings
- birthday parties
- resend and support guidance

Rules:
- Answer only from the facts below.
- If the answer is not in the facts, say you do not have that detail available on the website yet.
- When you do not know, tell the customer to contact ${env.SUPPORT_EMAIL}.
- Do not invent opening hours, location, attractions, food, weather, rules, refund policy, or bank details unless they are provided below.
- Keep answers friendly, concise, and practical.
- Use South African Rand formatting when mentioning prices.
- Do not mention internal implementation details, databases, webhooks, or admin screens unless they help explain a customer-facing booking step.

Facts:
- Day visitors can book online on the website.
- Customers book for a specific date. There are no time slots.
- Tickets are valid only for the selected date.
- One QR code is issued per order.
- At the gate, staff scan the order QR once, review the whole order, and admit the full group.
- 2 years and under are free for day visitor entry, but they must still be included for headcount.
- The website stores only the customer email for ticket delivery and resend.
- Payment methods offered on the website: Card, Instant EFT, and Manual EFT.
- Card payments stay pending until payment confirmation is received.
- Instant EFT is treated as auto-confirmed on the website.
- Manual EFT customers use the order ID as the payment reference, then upload proof of payment on the success page.
- Manual EFT tickets are only issued and emailed after an admin approves the proof of payment.
- After payment is confirmed, tickets are issued as a PDF and emailed.
- If email is delayed, customers can still use the success page to download the PDF when available.
- Support email: ${env.SUPPORT_EMAIL}
- Day visitor water activities add-on: ${formatZar(SWIM_ADDON_CENTS)} per person.
- Current day visitor prices:
${ticketLines}
- School outing packages:
${schoolOutingLines}
- School outing swimming add-on: ${formatZar(SCHOOL_OUTING_SWIM_ADDON_CENTS)} per person.
- Birthday party packages:
${birthdayLines}
- Birthday party extras:
${birthdayExtraLines}${extraLines}
`.trim();
}
