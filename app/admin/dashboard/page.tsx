import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";
import { formatZar } from "@/lib/money";
import { toYYYYMMDD } from "@/lib/dates";
import { getPublicRuntimeSnapshot } from "@/lib/runtimeChecks";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orders, todayCount, eftQueueCount, paidOrdersCount] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        customerEmail: true,
        visitDate: true,
        status: true,
        totalCents: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.ticket.count({ where: { visitDate: today } }),
    prisma.order.count({ where: { status: { in: ["PENDING_EFT", "EFT_REVIEW"] } } }),
    prisma.order.count({ where: { status: "PAID" } })
  ]);

  const runtime = getPublicRuntimeSnapshot();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <AdminNav />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">Today headcount (tickets)</div>
          <div className="text-2xl font-extrabold">{todayCount}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">EFT queue</div>
          <div className="text-2xl font-extrabold">{eftQueueCount}</div>
          <div className="mt-2 text-sm text-gray-600">Orders waiting for POP review or approval.</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">Paid orders</div>
          <div className="text-2xl font-extrabold">{paidOrdersCount}</div>
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
            <div>Deployment env: <span className="font-semibold">{runtime.vercelEnv}</span></div>
            <div>App URL: <span className="font-mono text-xs">{runtime.appBaseUrl}</span></div>
            <div>Database target: <span className="font-mono text-xs">{runtime.databaseTarget}</span></div>
            <div>Storage target: <span className="font-mono text-xs">{runtime.storageTarget}</span></div>
            <div>Storage bucket: <span className="font-mono text-xs">{runtime.storageBucket}</span></div>
            <div>Email provider: <span className="font-semibold">{runtime.emailProvider}</span></div>
            <div>SMTP ready: <span className="font-semibold">{runtime.smtpReady ? "yes" : "no"}</span></div>
            <div>Resend ready: <span className="font-semibold">{runtime.resendReady ? "yes" : "no"}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold">Recent orders</div>
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
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2">
                    <Link className="font-mono text-blue-700 hover:underline" href={`/admin/orders/${o.id}`}>
                      {o.id}
                    </Link>
                  </td>
                  <td>{o.customerEmail}</td>
                  <td>{toYYYYMMDD(o.visitDate)}</td>
                  <td className="font-semibold">{o.status}</td>
                  <td className="text-right font-semibold">{formatZar(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
