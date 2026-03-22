import { getActiveTicketTypes } from "@/lib/ticketTypes";
import Link from "next/link";

export default async function BookPage() {
  const types = await getActiveTicketTypes();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Book tickets</h1>
      <p className="text-gray-700">Select your visit date and quantities. You’ll choose swimming pass per attendee at checkout.</p>

      <div className="rounded border bg-white p-4">
        <form action="/checkout" method="GET" className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Visit date</label>
            <input
              required
              type="date"
              name="date"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>

          <div className="grid gap-3">
            {types.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-600">
                    {t.basePrice === 0 ? "FREE" : `R${(t.basePrice / 100).toFixed(0)}`}
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  defaultValue={0}
                  name={`qty_${t.code}`}
                  className="w-24 rounded border px-2 py-1 text-right"
                />
              </div>
            ))}
          </div>

          <button className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white">
            Continue to checkout
          </button>
        </form>
      </div>

      <div className="text-sm text-gray-700">
        Already have an order? You can use your <span className="font-semibold">Order ID</span> on the success page link in your email to download again.
      </div>

      <Link href="/support" className="text-sm text-blue-700 hover:underline">
        Need help? Support is for questions only (bookings are online).
      </Link>
    </div>
  );
}
