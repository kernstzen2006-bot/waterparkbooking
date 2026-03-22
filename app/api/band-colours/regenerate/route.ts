import { NextResponse } from "next/server";
import { regenerateTodayColours } from "@/lib/wristbands";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  await regenerateTodayColours();
  revalidatePath("/admin/band-colours");
  return NextResponse.redirect(new URL("/admin/band-colours", req.url), 303);
}
