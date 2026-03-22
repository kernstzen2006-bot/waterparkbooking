import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth";
import { env } from "@/lib/env";

export async function GET() {
  const res = NextResponse.redirect(`${env.APP_BASE_URL}/admin/login`);
  clearAdminCookie(res);
  return res;
}
