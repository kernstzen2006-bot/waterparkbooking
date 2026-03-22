import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";
import { formatZar } from "@/lib/money";
import { toYYYYMMDD } from "@/lib/dates";

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      customerEmail: true,
      visitDate: true,
      status: true,
      totalCents: true,
      pdfStorageKey: true,
      manualEftPopKey: true,
      tickets: {
        select: {
          id: true,
          hasSwimmingPass: true,
          status: true,
          usedAt: true,
          usedByScannerId: true,
          ticketType: {
            select: {
              code: true,
            },
          },
        },
      },
      payments: true,
    }
  });

  if (!order) return <div>Order not found</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Order {order.id}</h1>
      <AdminNav />

      <div className="rounded border bg-white p-4 text-sm space-y-1">
        <div className="flex justify-between"><span>Email</span><span className="font-semibold">{order.customerEmail}</span></div>
        <div className="flex justify-between"><span>Visit date</span><span className="font-semibold">{toYYYYMMDD(order.visitDate)}</span></div>
        <div className="flex justify-between"><span>Status</span><span className="font-semibold">{order.status}</span></div>
        <div className="flex justify-between"><span>Total</span><span className="font-semibold">{formatZar(order.totalCents)}</span></div>
        <div className="flex justify-between"><span>PDF</span><span className="font-mono text-xs">{order.pdfStorageKey ?? "-"}</span></div>
        <div className="flex justify-between"><span>POP</span><span className="font-mono text-xs">{order.manualEftPopKey ?? "-"}</span></div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold">Tickets</div>
        <div className="mt-2 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="py-2">Ticket</th>
                <th>Type</th>
                <th>Swim</th>
                <th>Status</th>
                <th>Used at</th>
                <th>Scanner</th>
              </tr>
            </thead>
            <tbody>
              {order.tickets.map((t) => (
                <tr className="border-t" key={t.id}>
                  <td className="py-2 font-mono text-xs">{t.id}</td>
                  <td className="font-semibold">{t.ticketType.code}</td>
                  <td>{t.hasSwimmingPass ? "YES" : "NO"}</td>
                  <td className="font-semibold">{t.status}</td>
                  <td>{t.usedAt ? new Date(t.usedAt).toLocaleString() : "-"}</td>
                  <td className="font-mono text-xs">{t.usedByScannerId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <form action="/api/tickets/resend" method="POST">
            <input type="hidden" name="orderId" value={order.id} />
            <button className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Resend tickets</button>
          </form>

          <form action="/api/tickets/issue" method="POST">
            <input type="hidden" name="orderId" value={order.id} />
            <button className="rounded border px-3 py-2 text-sm font-semibold">Re-issue PDF</button>
          </form>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold">Payments</div>
        <pre className="mt-2 overflow-auto rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(order.payments, null, 2)}
        </pre>
      </div>
    </div>
  );
}
