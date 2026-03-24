"use client";

import { useMemo, useState } from "react";
import { formatZar } from "@/lib/money";
import { PriceSummary } from "@/components/PriceSummary";
import { SWIM_ADDON_CENTS } from "@/lib/pricing";

type TypeRow = { code: string; name: string; basePriceCents: number };

type AttendeeDraft = {
  ticketTypeCode: string;
  hasSwimmingPass: boolean;
};

export function CheckoutClient(props: {
  visitDate: string; // YYYY-MM-DD
  types: TypeRow[];
  initialQtyByCode: Record<string, number>;
  totalAttendees: number;
}) {
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "INSTANT_EFT" | "MANUAL_EFT">("CARD");

  const attendees = useMemo<AttendeeDraft[]>(() => {
    const list: AttendeeDraft[] = [];
    for (const t of props.types) {
      const qty = props.initialQtyByCode[t.code] ?? 0;
      for (let i = 0; i < qty; i++) {
        list.push({ ticketTypeCode: t.code, hasSwimmingPass: false });
      }
    }
    return list;
  }, [props.types, props.initialQtyByCode]);

  const [drafts, setDrafts] = useState(attendees);

  const price = useMemo(() => {
    const typeMap = new Map(props.types.map((t) => [t.code, t]));
    let subtotal = 0;
    let addOns = 0;
    for (const a of drafts) {
      const t = typeMap.get(a.ticketTypeCode)!;
      subtotal += t.basePriceCents;
      if (a.hasSwimmingPass) addOns += SWIM_ADDON_CENTS;
    }
    return { subtotal, addOns, total: subtotal + addOns };
  }, [drafts, props.types]);

  async function createOrder() {
    if (!email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }
    if (drafts.length === 0) {
      alert("Please select at least 1 ticket.");
      return;
    }

    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerEmail: email,
        visitDate: props.visitDate,
        paymentMethod,
        attendees: drafts
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to create order");
      return;
    }

    // For this production skeleton:
    // - CARD: you would redirect to provider checkout URL (data.checkoutUrl)
    // - INSTANT_EFT: treat as auto-confirmed in this demo
    // - MANUAL_EFT: show banking details + upload POP on success page
    window.location.href = `/success?orderId=${encodeURIComponent(data.orderId)}`;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded border bg-white p-4">
          <div className="font-semibold">Customer email</div>
          <input
            className="mt-2 w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="mt-4 font-semibold">Payment method</div>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={paymentMethod === "CARD"} onChange={() => setPaymentMethod("CARD")} />
              Card (webhook confirmation required)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={paymentMethod === "INSTANT_EFT"}
                onChange={() => setPaymentMethod("INSTANT_EFT")}
              />
              Instant EFT (auto-confirmed)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={paymentMethod === "MANUAL_EFT"}
                onChange={() => setPaymentMethod("MANUAL_EFT")}
              />
              Manual EFT (upload POP, admin approves)
            </label>
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Attendees</div>
            <div className="text-sm text-gray-600">{drafts.length} tickets</div>
          </div>

          <div className="mt-3 space-y-2">
            {drafts.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <div className="font-medium">{a.ticketTypeCode}</div>
                  <div className="text-gray-600">
                    Swim: <span className="font-semibold">{a.hasSwimmingPass ? "YES" : "NO"}</span>
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Swimming +R100</span>
                  <input
                    type="checkbox"
                    checked={a.hasSwimmingPass}
                    onChange={(e) => {
                      const next = drafts.slice();
                      const cur = next[idx];
                      if (!cur) return;
                      next[idx] = { ...cur, hasSwimmingPass: e.target.checked };
                      setDrafts(next);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <button onClick={createOrder} className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          Place order ({formatZar(price.total)})
        </button>

        <p className="text-xs text-gray-600">
          Minimal PII: only your email is stored for ticket delivery and resend.
        </p>
      </div>

      <div className="space-y-4">
        <PriceSummary subtotalCents={price.subtotal} addOnsCents={price.addOns} totalCents={price.total} />

        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <div className="font-semibold">Terms (basic)</div>
          <ul className="mt-2 list-disc pl-5">
            <li>Tickets are valid only for the selected date.</li>
            <li>One QR code per order; staff scan once, review the whole order, and admit the full group at the gate.</li>
            <li>Under-3 tickets are free but must be included for headcount.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
