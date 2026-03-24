import { unstable_noStore as noStore } from "next/cache";
import { AdminNav } from "@/components/AdminNav";
import { EftApprovalsLive } from "@/components/EftApprovalsLive";
import { getEftQueueOrders } from "@/lib/adminData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EftApprovalsPage() {
  noStore();
  const orders = await getEftQueueOrders();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">EFT approvals</h1>
      <AdminNav />
      <EftApprovalsLive initialOrders={orders} />
    </div>
  );
}
