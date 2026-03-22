import { parseDateOnlyFromYYYYMMDD, toYYYYMMDD } from "@/lib/dates";
import { getActiveTicketTypes } from "@/lib/ticketTypes";
import { CheckoutClient } from "./ui";

export default async function CheckoutPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const dateStr = typeof searchParams.date === "string" ? searchParams.date : "";
  const visitDate = parseDateOnlyFromYYYYMMDD(dateStr);

  const types = await getActiveTicketTypes();

  const qtyByCode: Record<string, number> = {};
  for (const t of types) {
    const k = `qty_${t.code}`;
    const v = typeof searchParams[k] === "string" ? Number(searchParams[k]) : 0;
    qtyByCode[t.code] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  const totalAttendees = Object.values(qtyByCode).reduce((a, b) => a + b, 0);
  const visitDateStr = toYYYYMMDD(visitDate);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="text-gray-700">
        Visit date: <span className="font-semibold">{visitDateStr}</span>
      </p>

      <CheckoutClient
        visitDate={visitDateStr}
        types={types.map((t) => ({
          code: t.code,
          name: t.name,
          basePriceCents: t.basePrice
        }))}
        initialQtyByCode={qtyByCode}
        totalAttendees={totalAttendees}
      />
    </div>
  );
}
