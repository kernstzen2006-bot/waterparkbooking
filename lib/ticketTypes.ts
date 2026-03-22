import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const getActiveTicketTypesCached = unstable_cache(
  async () =>
    prisma.ticketType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        basePrice: true,
      },
      orderBy: { basePrice: "desc" },
    }),
  ["active-ticket-types"],
  { tags: ["ticket-types"] }
);

export async function getActiveTicketTypes() {
  return getActiveTicketTypesCached();
}
