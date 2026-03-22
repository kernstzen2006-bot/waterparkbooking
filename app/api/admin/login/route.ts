import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!email || !password) return NextResponse.json({ error: "Email + password required" }, { status: 400 });

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    let passwordOk: boolean;
    try {
      passwordOk = await bcrypt.compare(password, admin.passwordHash);
    } catch {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (!passwordOk) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await createAdminSessionToken({ adminId: admin.id, email: admin.email });
    const cookieStore = cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions());

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin login:", e);
    const dev = process.env.NODE_ENV === "development";
    const detail = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: dev ? `Server error: ${detail}` : "Server error" },
      { status: 500 }
    );
  }
}
