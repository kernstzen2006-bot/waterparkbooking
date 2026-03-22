import Link from "next/link";

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
        <p className="font-semibold">Ticket products</p>
        <ul className="list-disc pl-5">
          <li>Adult Day Pass = R150</li>
          <li>Kid Day Pass = R100</li>
          <li>Pensioner Day Pass = R100</li>
          <li>Under 3 years old = FREE (R0, still gets QR/PDF)</li>
          <li>Swimming Pass add-on = +R100 per person (optional for all)</li>
        </ul>
      </div>
    </div>
  );
}
