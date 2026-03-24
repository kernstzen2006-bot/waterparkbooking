"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardOrder = {
  id: string;
  customerEmail: string;
  visitDate: string;
  status: string;
  totalCents: number;
};

type RuntimeInfo = {
  vercelEnv: string;
  appBaseUrl: string;
  databaseTarget: string;
  storageTarget: string;
  storageBucket: string;
  emailProvider: string;
  smtpReady: boolean;
  resendReady: boolean;
};

type OverviewData = {
  orders: DashboardOrder[];
  todayCount: number;
  eftQueueCount: number;
  paidOrdersCount: number;
  runtime: RuntimeInfo;
};

function formatZar(cents: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2
  }).format(cents / 100);
}

function formatDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function AdminDashboardLive({ initialData }: { initialData: OverviewData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/overview", {
          cache: "no-store",
          credentials: "same-origin"
        });
        if (!res.ok) {
          throw new Error(`Overview refresh failed (${res.status})`);
        }

        const next = (await res.json()) as OverviewData;
        if (!cancelled) {
          setData(next);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Overview refresh failed");
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
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">Today headcount (tickets)</div>
          <div className="text-2xl font-extrabold">{data.todayCount}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">EFT queue</div>
          <div className="text-2xl font-extrabold">{data.eftQueueCount}</div>
          <div className="mt-2 text-sm text-gray-600">Orders waiting for POP review or approval.</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">Paid orders</div>
          <div className="text-2xl font-extrabold">{data.paidOrdersCount}</div>
          <div className="mt-2 text-sm text-gray-600">Useful when email is failing after payment.</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">Quick actions</div>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <Link className="rounded border px-3 py-2 hover:bg-gray-50" href="/admin/eft-approvals">Review EFT POP</Link>
            <Link className="rounded border px-3 py-2 hover:bg-gray-50" href="/admin/band-colours">Today wristbands</Link>
            <Link className="rounded border px-3 py-2 hover:bg-gray-50" href="/admin/scan-logs">Scan logs</Link>
          </div>
        </div>
        <div className="rounded border bg-white p-4 text-sm">
          <div className="text-xs text-gray-600">Runtime checks</div>
          <div className="mt-2 space-y-1 text-gray-700">
            <div>Deployment env: <span className="font-semibold">{data.runtime.vercelEnv}</span></div>
            <div>App URL: <span className="font-mono text-xs">{data.runtime.appBaseUrl}</span></div>
            <div>Database target: <span className="font-mono text-xs">{data.runtime.databaseTarget}</span></div>
            <div>Storage target: <span className="font-mono text-xs">{data.runtime.storageTarget}</span></div>
            <div>Storage bucket: <span className="font-mono text-xs">{data.runtime.storageBucket}</span></div>
            <div>Email provider: <span className="font-semibold">{data.runtime.emailProvider}</span></div>
            <div>SMTP ready: <span className="font-semibold">{data.runtime.smtpReady ? "yes" : "no"}</span></div>
            <div>Resend ready: <span className="font-semibold">{data.runtime.resendReady ? "yes" : "no"}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Recent orders</div>
          <div className="text-xs text-gray-500">{loading ? "Refreshing..." : "Auto-refresh every 15s"}</div>
        </div>
        {error ? <div className="mt-2 text-sm text-red-700">{error}</div> : null}
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="py-2">Order</th>
                <th>Email</th>
                <th>Visit date</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2">
                    <Link className="font-mono text-blue-700 hover:underline" href={`/admin/orders/${o.id}`}>
                      {o.id}
                    </Link>
                  </td>
                  <td>{o.customerEmail}</td>
                  <td>{formatDate(o.visitDate)}</td>
                  <td className="font-semibold">{o.status}</td>
                  <td className="text-right font-semibold">{formatZar(o.totalCents)}</td>
                </tr>
              ))}
              {data.orders.length === 0 ? (
                <tr><td className="py-4 text-gray-600" colSpan={5}>No orders found in the current deployment database.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
