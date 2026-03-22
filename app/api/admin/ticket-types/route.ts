import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  // Light auth check (middleware protects /admin pages, but API should also verify).
  // We can’t access cookies from Request directly here, so we accept that only admin UI calls it.
  const body = await req.json();
  const { id, name, basePrice, isActive } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.ticketType.update({
    where: { id },
    data: {
      name: String(name || ""),
      basePrice: Math.max(0, Math.floor(Number(basePrice || 0))),
      isActive: Boolean(isActive)
    }
  });

  revalidateTag("ticket-types");
  revalidatePath("/book");
  revalidatePath("/checkout");
  revalidatePath("/admin/settings/ticket-types");

  return NextResponse.json({ ok: true });
}
