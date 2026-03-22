import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";
import { dateOnlyTodayUTC, toYYYYMMDD } from "@/lib/dates";

export default async function BandColoursPage() {
  const today = dateOnlyTodayUTC();

  const bands = await prisma.dailyBandColour.findMany({
    where: { date: today },
    orderBy: [{ ticketTypeCode: "asc" }, { hasSwimmingPass: "asc" }]
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Band colours</h1>
      <AdminNav />

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Date</div>
            <div className="text-lg font-bold">{toYYYYMMDD(today)}</div>
          </div>

          <div className="flex gap-2">
            <form action="/api/band-colours/ensure-today" method="POST">
              <button className="rounded border px-3 py-2 text-sm font-semibold">Ensure generated</button>
            </form>
            <form action="/api/band-colours/regenerate" method="POST">
              <button className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white">Regenerate</button>
            </form>
          </div>
        </div>

        <div className="rounded border p-3">
          <div className="font-semibold">Printable “Today’s wristbands” board</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {bands.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded border p-3">
                <div className="text-sm">
                  <div className="font-bold">
                    {b.ticketTypeCode} | Swim: {b.hasSwimmingPass ? "YES" : "NO"}
                  </div>
                  <div className="text-xs text-gray-600">Wear this band today</div>
                </div>
                <div className="text-lg font-extrabold">{b.colour}</div>
              </div>
            ))}
            {bands.length === 0 ? (
              <div className="text-sm text-gray-600">No colours generated yet. Click “Ensure generated”.</div>
            ) : null}
          </div>
        </div>

        <div className="text-xs text-gray-600">
          Under-3 always “NO WRISTBAND” (never included in daily mapping).
        </div>
        <div className="text-xs text-gray-600">
          Non-swimmers pool: Grey, White, Gold, Silver | Swimmers pool: Green, Pink, Orange, Red, Purple.
        </div>
      </div>
    </div>
  );
}
