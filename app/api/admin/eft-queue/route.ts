import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEftQueueOrders } from "@/lib/adminData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const orders = await getEftQueueOrders();
  return NextResponse.json(
    { orders },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
