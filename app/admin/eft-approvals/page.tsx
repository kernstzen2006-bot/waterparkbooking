import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";

export default async function EftApprovalsPage() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      customerEmail: true,
      status: true,
      manualEftPopUrl: true,
    },
    where: { status: { in: ["PENDING_EFT", "EFT_REVIEW"] } },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">EFT approvals</h1>
      <AdminNav />

      <div className="rounded border bg-white p-4">
        <div className="font-semibold">Pending POP uploads</div>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="py-2">Order</th>
                <th>Email</th>
                <th>Status</th>
                <th>POP</th>
                <th>Approve</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2 font-mono text-xs">{o.id}</td>
                  <td>{o.customerEmail}</td>
                  <td className="font-semibold">{o.status}</td>
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
                <tr><td className="py-4 text-gray-600" colSpan={5}>No pending EFT approvals.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
