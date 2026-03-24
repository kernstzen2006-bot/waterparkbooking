import Link from "next/link";
import {
  BIRTHDAY_PARTY_EXTRAS,
  BIRTHDAY_PARTY_OPTIONS,
  SCHOOL_OUTING_OPTIONS,
  SCHOOL_OUTING_SWIM_ADDON_CENTS,
  SWIM_ADDON_CENTS,
} from "@/lib/pricing";
import { formatZar } from "@/lib/money";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Waterpark Online Booking</h1>
      <p className="text-gray-700">
        Book for a specific date. No time slots. Tickets are delivered as a PDF with QR codes.
      </p>
      <div className="flex gap-3">
        <Link className="rounded bg-blue-600 px-4 py-2 text-white" href="/book">
          Book now
        </Link>
        <Link className="rounded border px-4 py-2" href="/support">
          Support
        </Link>
      </div>

      <div className="rounded border bg-white p-4 text-sm text-gray-700">
        <p className="font-semibold">Day visitor pricing</p>
        <ul className="list-disc pl-5">
          <li>2 years and under = FREE</li>
          <li>3-17 years = R90</li>
          <li>Adults = R105</li>
          <li>Pensioners = R90</li>
          <li>Water activities add-on = +{formatZar(SWIM_ADDON_CENTS)} per person</li>
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <p className="font-semibold">School outings</p>
          <ul className="mt-2 list-disc pl-5">
            {SCHOOL_OUTING_OPTIONS.map((option) => (
              <li key={option.code}>
                {option.label} ({option.hours}) = {formatZar(option.priceCents)}/person
              </li>
            ))}
            <li>Swimming add-on = +{formatZar(SCHOOL_OUTING_SWIM_ADDON_CENTS)}/person</li>
          </ul>
        </div>

        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <p className="font-semibold">Birthday parties</p>
          <ul className="mt-2 list-disc pl-5">
            {BIRTHDAY_PARTY_OPTIONS.map((option) => (
              <li key={option.code}>
                {option.label} = {formatZar(option.priceCents)}/child, minimum {option.minimumChildren} children
              </li>
            ))}
            {BIRTHDAY_PARTY_EXTRAS.map((extra) => (
              <li key={extra.code}>
                {extra.label} = {formatZar(extra.priceCents)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
