import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";
import { TicketTypeEditor } from "@/components/TicketTypeEditor";

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
        Production note: You required ticket products “exactly”. Keep codes stable (ADULT/KID/PENSIONER/UNDER3).
      </div>
    </div>
  );
}
