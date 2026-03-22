import { NextResponse } from "next/server";
import { ensureTodayColours } from "@/lib/wristbands";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  await ensureTodayColours();
  revalidatePath("/admin/band-colours");
  return NextResponse.redirect(new URL("/admin/band-colours", req.url), 303);
}
