import { prisma } from "@/lib/prisma";
import { formatZar } from "@/lib/money";
import { toYYYYMMDD } from "@/lib/dates";
import Link from "next/link";
import { PopUpload } from "./ui";

export default async function SuccessPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const orderId = searchParams.orderId ?? "";
  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          visitDate: true,
          totalCents: true,
          pdfUrl: true,
          manualEftPopUrl: true,
          tickets: {
            select: {
              id: true,
              hasSwimmingPass: true,
              status: true,
              ticketType: {
                select: {
                  code: true,
                },
              },
            },
          },
        }
      })
    : null;

  if (!order) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="text-gray-700">Check your Order ID.</p>
        <Link className="text-blue-700 hover:underline" href="/book">Go to booking</Link>
      </div>
    );
  }

  const paid = order.status === "PAID";
  const pendingEft = order.status === "PENDING_EFT" || order.status === "EFT_REVIEW";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Order {order.id}</h1>

      <div className="rounded border bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-semibold">{order.status}</span>
        </div>
        <div className="flex justify-between">
          <span>Visit date</span>
          <span className="font-semibold">{toYYYYMMDD(order.visitDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total</span>
          <span className="font-semibold">{formatZar(order.totalCents)}</span>
        </div>
        <div className="mt-3">
          <div className="font-semibold">Tickets</div>
          <ul className="mt-2 list-disc pl-5">
            {order.tickets.map((t) => (
              <li key={t.id}>
                {t.ticketType.code} | Swim: {t.hasSwimmingPass ? "YES" : "NO"} | {t.status}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {paid ? (
        <div className="rounded border bg-green-50 p-4">
          <div className="text-lg font-bold text-green-800">Payment confirmed ✅</div>
          <p className="text-sm text-green-800">
            Your tickets have been issued. We emailed your PDF.
          </p>
          {order.pdfUrl ? (
            <a className="mt-3 inline-block rounded bg-green-700 px-4 py-2 font-semibold text-white" href={order.pdfUrl}>
              Download PDF
            </a>
          ) : (
            <p className="mt-2 text-sm text-gray-700">If your PDF is still generating, use “Resend tickets” in Support.</p>
          )}
        </div>
      ) : pendingEft ? (
        <div className="rounded border bg-yellow-50 p-4">
          <div className="text-lg font-bold text-yellow-800">Manual EFT pending</div>
          <p className="text-sm text-yellow-800">
            Use this reference: <span className="font-semibold">{order.id}</span>. Upload your proof of payment below.
          </p>

          <div className="mt-3 rounded border bg-white p-3 text-sm">
            <div className="font-semibold">Banking details (example)</div>
            <div>Bank: Example Bank</div>
            <div>Account: 123456789</div>
            <div>Branch: 0001</div>
            <div>Reference: {order.id}</div>
          </div>

          <div className="mt-3">
            <PopUpload orderId={order.id} already={Boolean(order.manualEftPopUrl)} />
          </div>
        </div>
      ) : (
        <div className="rounded border bg-gray-100 p-4">
          <div className="text-lg font-bold">Awaiting payment</div>
          <p className="text-sm text-gray-700">
            If you paid by card, the provider webhook must confirm before issuing tickets.
          </p>
        </div>
      )}

      <div className="text-sm">
        Need help? <Link className="text-blue-700 hover:underline" href="/support">Support</Link>
      </div>
    </div>
  );
}
