import { NextResponse } from "next/server";
import { ensureTodayColours } from "@/lib/wristbands";

export async function GET() {
  await ensureTodayColours();
  return NextResponse.json({ ok: true });
}
