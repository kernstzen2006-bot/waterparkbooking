"use client";

import { formatZar } from "@/lib/money";

export function PriceSummary(props: { subtotalCents: number; addOnsCents: number; totalCents: number }) {
  return (
    <div className="rounded border bg-white p-4 text-sm">
      <div className="flex justify-between">
        <span>Base tickets</span>
        <span className="font-medium">{formatZar(props.subtotalCents)}</span>
      </div>
      <div className="flex justify-between">
        <span>Swimming add-ons</span>
        <span className="font-medium">{formatZar(props.addOnsCents)}</span>
      </div>
      <div className="mt-2 flex justify-between border-t pt-2 text-base">
        <span className="font-semibold">Total</span>
        <span className="font-bold">{formatZar(props.totalCents)}</span>
      </div>
    </div>
  );
}
