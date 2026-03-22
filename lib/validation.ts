import { z } from "zod";

export const createOrderSchema = z.object({
  customerEmail: z.string().email(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["CARD", "INSTANT_EFT", "MANUAL_EFT"]),
  attendees: z.array(
    z.object({
      ticketTypeCode: z.enum(["ADULT", "KID", "PENSIONER", "UNDER3"]),
      hasSwimmingPass: z.boolean()
    })
  ).min(1)
});
