import { SupportChat } from "@/components/SupportChat";
import { env } from "@/lib/env";

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support</h1>
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.4fr]">
        <div className="space-y-4">
          <div className="rounded border bg-white p-4 text-sm text-gray-700 space-y-2">
            <p className="font-semibold">Bookings are online only.</p>
            <p>Book for a specific date. There are no time slots.</p>
            <p>Tickets are sent as a PDF after payment is confirmed.</p>
            <p>If you need help, keep your Order ID ready when contacting support.</p>
          </div>

          <div className="rounded border bg-white p-4 text-sm text-gray-700">
            <div className="font-semibold">Quick help</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Manual EFT customers must upload POP on the success page.</li>
              <li>Tickets are only issued after payment is confirmed.</li>
              <li>Under-3 visitors are free but must still be included for headcount.</li>
              <li>One QR code covers the full order at the gate.</li>
            </ul>
          </div>

          <div className="rounded border bg-white p-4 text-sm text-gray-700">
            <div className="font-semibold">Need direct help?</div>
            <p className="mt-2">
              Email <span className="font-semibold">{env.SUPPORT_EMAIL}</span> and include your Order ID if you have one.
            </p>
          </div>
        </div>

        <SupportChat
          venueName={env.VENUE_NAME}
          supportEmail={env.SUPPORT_EMAIL}
          enabled={Boolean(env.GEMINI_API_KEY)}
        />
      </div>
    </div>
  );
}
