import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/AdminNav";

export default async function ScanLogsPage() {
  const logs = await prisma.scanLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 200
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Scan logs</h1>
      <AdminNav />

      <div className="rounded border bg-white p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-600">
              <th className="py-2">Time</th>
              <th>Result</th>
              <th>Reason</th>
              <th>Ticket</th>
              <th>Order</th>
              <th>Scanner</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="py-2">{new Date(l.timestamp).toLocaleString()}</td>
                <td className={`font-bold ${l.result === "VALID" ? "text-green-700" : "text-red-700"}`}>
                  {l.result}
                </td>
                <td className="text-xs">{l.reason ?? "-"}</td>
                <td className="font-mono text-xs">{l.ticketId ?? "-"}</td>
                <td className="font-mono text-xs">{l.orderId ?? "-"}</td>
                <td className="font-mono text-xs">{l.scannerId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
