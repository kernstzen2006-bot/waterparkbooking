import { getActiveTicketTypes } from "@/lib/ticketTypes";
import {
  BIRTHDAY_PARTY_EXTRAS,
  BIRTHDAY_PARTY_OPTIONS,
  SCHOOL_OUTING_OPTIONS,
  SCHOOL_OUTING_SWIM_ADDON_CENTS,
  SWIM_ADDON_CENTS,
  getConfiguredDayVisitorTypes,
} from "@/lib/pricing";
import { formatZar } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const types = getConfiguredDayVisitorTypes(await getActiveTicketTypes());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book a visit</h1>
        <p className="mt-1 text-gray-700">
          Day visitors can book online below. School outings and birthday parties are listed here as package options so customers can see the latest pricing.
        </p>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Day visitors</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select your visit date and quantities. Water activities are added per attendee at checkout for {formatZar(SWIM_ADDON_CENTS)} each.
          </p>
        </div>

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
            {types.map((ticketType) => (
              <div key={ticketType.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-semibold">{ticketType.name}</div>
                  <div className="text-sm text-gray-600">
                    {ticketType.basePrice === 0 ? "FREE" : formatZar(ticketType.basePrice)}
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  defaultValue={0}
                  name={`qty_${ticketType.code}`}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">School outings</h2>
          <p className="mt-1 text-gray-600">
            Group pricing for school visits. Swimming is an optional add-on.
          </p>
          <ul className="mt-3 space-y-2">
            {SCHOOL_OUTING_OPTIONS.map((option) => (
              <li key={option.code} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.hours}</div>
                </div>
                <div className="font-semibold">{formatZar(option.priceCents)}/person</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded bg-blue-50 p-3 text-blue-900">
            Swimming add-on: <span className="font-semibold">{formatZar(SCHOOL_OUTING_SWIM_ADDON_CENTS)}/person</span>
          </div>
        </div>

        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">Birthday parties</h2>
          <p className="mt-1 text-gray-600">
            2-hour party options. Each package has a minimum of 10 children.
          </p>
          <ul className="mt-3 space-y-2">
            {BIRTHDAY_PARTY_OPTIONS.map((option) => (
              <li key={option.code} className="rounded border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{option.label}</div>
                  <div className="font-semibold">{formatZar(option.priceCents)}/child</div>
                </div>
                <div className="mt-1 text-xs text-gray-500">{option.description}</div>
                <div className="mt-1 text-xs text-gray-500">Minimum {option.minimumChildren} children</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {BIRTHDAY_PARTY_EXTRAS.map((extra) => (
              <div key={extra.code} className="rounded border p-3">
                <div className="font-semibold">{extra.label}</div>
                <div className="mt-1 text-sm">{formatZar(extra.priceCents)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-700">
        Already have an order? You can use your <span className="font-semibold">Order ID</span> on the success page link in your email to download again.
      </div>

      <Link href="/support" className="text-sm text-blue-700 hover:underline">
        Need help with day visitors, school outings, or birthday parties? Support can help.
      </Link>
    </div>
  );
}
