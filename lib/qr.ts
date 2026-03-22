import crypto from "crypto";
import { env } from "@/lib/env";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBuf(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

/** One signed QR per order (not per ticket). */
export type QrPayload = {
  orderId: string;
  visitDate: string; // YYYY-MM-DD
  nonce: string;
  iat: number;
};

export function makeNonce(): string {
  return b64url(crypto.randomBytes(16));
}

export function signQrPayload(payload: QrPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = crypto
    .createHmac("sha256", env.QR_HMAC_SECRET)
    .update(body)
    .digest();
  return `${body}.${b64url(sig)}`;
}

export function verifyQrToken(token: string): { ok: true; payload: QrPayload } | { ok: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "Malformed token" };
  const body = parts[0];
  const sig = parts[1];
  if (body === undefined || sig === undefined) return { ok: false, reason: "Malformed token" };

  const expected = crypto.createHmac("sha256", env.QR_HMAC_SECRET).update(body).digest();
  const given = b64urlToBuf(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return { ok: false, reason: "Bad signature" };
  }

  try {
    const json = b64urlToBuf(body).toString("utf8");
    const payload = JSON.parse(json) as QrPayload;
    if (!payload.orderId || !payload.visitDate || !payload.nonce) return { ok: false, reason: "Invalid payload" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "Invalid payload" };
  }
}
