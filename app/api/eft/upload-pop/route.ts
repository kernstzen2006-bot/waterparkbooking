import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadBytes } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const orderId = String(fd.get("orderId") || "");
    const file = fd.get("file") as File | null;
    if (!orderId || !file) return NextResponse.json({ error: "orderId + file required" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = file.type === "application/pdf" ? "pdf" : "png";
    const key = `orders/${orderId}/pop.${ext}`;

    const uploaded = await uploadBytes(key, bytes, file.type || "application/octet-stream");

    await prisma.order.update({
      where: { id: orderId },
      data: {
        manualEftPopUrl: uploaded.publicUrl,
        manualEftPopKey: uploaded.key,
        status: "EFT_REVIEW"
      }
    });

    console.info("[eft/upload-pop] stored", {
      orderId,
      previousStatus: order.status,
      nextStatus: "EFT_REVIEW",
      fileType: file.type || "application/octet-stream",
      bytes: bytes.length,
      popUrl: uploaded.publicUrl
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/eft-approvals");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/success");

    return NextResponse.json({ ok: true, popUrl: uploaded.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload error" }, { status: 500 });
  }
}
