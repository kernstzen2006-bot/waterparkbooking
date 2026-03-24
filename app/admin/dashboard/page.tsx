import { unstable_noStore as noStore } from "next/cache";
import { AdminNav } from "@/components/AdminNav";
import { AdminDashboardLive } from "@/components/AdminDashboardLive";
import { getAdminOverview } from "@/lib/adminData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  noStore();
  const initialData = await getAdminOverview();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <AdminNav />
      <AdminDashboardLive initialData={initialData} />
    </div>
  );
}
