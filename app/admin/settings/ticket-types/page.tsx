import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";
import { TicketTypeEditor } from "@/components/TicketTypeEditor";

export const dynamic = "force-dynamic";

export default async function TicketTypesSettings() {
  const rows = await prisma.ticketType.findMany({ orderBy: { basePrice: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ticket types</h1>
      <AdminNav />
      <TicketTypeEditor
        rows={rows.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          basePrice: r.basePrice,
          isActive: r.isActive
        }))}
      />
      <div className="text-xs text-gray-600">
        Production note: Keep codes stable (ADULT/KID/PENSIONER/UNDER3). Public day visitor pricing is currently fixed in the booking package configuration, so reseed or align these rows if you want the admin data to match the live booking page exactly.
      </div>
    </div>
  );
}
