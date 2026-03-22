import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "admin_session";

function secretKey() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

const isProd = process.env.NODE_ENV === "production";

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** JWT for the admin_session cookie (use with cookies().set in Route Handlers). */
export async function createAdminSessionToken(payload: { adminId: string; email: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function setAdminCookie(res: NextResponse, payload: { adminId: string; email: string }) {
  const token = await createAdminSessionToken(payload);
  res.cookies.set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions());
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function isAdminRequestAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(req: NextRequest): Promise<{ ok: true; admin: any } | { ok: false; res: NextResponse }> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try {
    const v = await jwtVerify(token, secretKey());
    return { ok: true, admin: v.payload };
  } catch {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}
