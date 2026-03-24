"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EftOrder = {
  id: string;
  customerEmail: string;
  status: string;
  updatedAt: string;
  manualEftPopUrl: string | null;
};

type QueueData = {
  orders: EftOrder[];
};

export function EftApprovalsLive({ initialOrders }: { initialOrders: EftOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/eft-queue", {
          cache: "no-store",
          credentials: "same-origin"
        });
        if (!res.ok) {
          throw new Error(`EFT refresh failed (${res.status})`);
        }

        const next = (await res.json()) as QueueData;
        if (!cancelled) {
          setOrders(next.orders);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "EFT refresh failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    refresh();
    const id = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Pending POP uploads</div>
        <div className="text-xs text-gray-500">{loading ? "Refreshing..." : "Auto-refresh every 15s"}</div>
      </div>
      {error ? <div className="mt-2 text-sm text-red-700">{error}</div> : null}
      <div className="mt-3 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-600">
              <th className="py-2">Order</th>
              <th>Email</th>
              <th>Status</th>
              <th>Updated</th>
              <th>POP</th>
              <th>Approve</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2 font-mono text-xs">
                  <Link className="text-blue-700 hover:underline" href={`/admin/orders/${o.id}`}>
                    {o.id}
                  </Link>
                </td>
                <td>{o.customerEmail}</td>
                <td className="font-semibold">{o.status}</td>
                <td>{new Date(o.updatedAt).toLocaleString()}</td>
                <td>
                  {o.manualEftPopUrl ? (
                    <a className="text-blue-700 hover:underline" href={o.manualEftPopUrl} target="_blank">
                      View POP
                    </a>
                  ) : (
                    <span className="text-gray-500">No upload</span>
                  )}
                </td>
                <td>
                  <form action="/api/eft/approve" method="POST">
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="rounded bg-green-700 px-3 py-1 text-xs font-semibold text-white" disabled={!o.manualEftPopUrl}>
                      Approve & issue
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr><td className="py-4 text-gray-600" colSpan={6}>No pending EFT approvals in the current deployment database.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
