import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";
import { formatZar } from "@/lib/money";
import { toYYYYMMDD } from "@/lib/dates";

export default async function AdminDashboard() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      customerEmail: true,
      visitDate: true,
      status: true,
      totalCents: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = await prisma.ticket.count({ where: { visitDate: today } });

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
          <div className="text-xs text-gray-600">Quick actions</div>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <Link className="rounded border px-3 py-2 hover:bg-gray-50" href="/admin/eft-approvals">Review EFT POP</Link>
            <Link className="rounded border px-3 py-2 hover:bg-gray-50" href="/admin/band-colours">Today wristbands</Link>
            <Link className="rounded border px-3 py-2 hover:bg-gray-50" href="/admin/scan-logs">Scan logs</Link>
          </div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-600">Note</div>
          <div className="mt-2 text-sm text-gray-700">
            Resends + issuance are server-side and logged.
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
