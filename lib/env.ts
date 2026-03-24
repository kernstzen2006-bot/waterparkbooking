function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function normalizeBaseUrl(raw?: string): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function isLocalBaseUrl(raw: string): boolean {
  try {
    const { hostname } = new URL(raw);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

function resolveAppBaseUrl(): string {
  const explicitCandidates = [
    normalizeBaseUrl(process.env.APP_BASE_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
  ].filter((value): value is string => Boolean(value));

  const vercelCandidates = [
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    normalizeBaseUrl(process.env.VERCEL_URL),
  ].filter((value): value is string => Boolean(value));

  const preferredExplicit = explicitCandidates.find((value) => !isLocalBaseUrl(value));
  if (preferredExplicit) return preferredExplicit;

  const preferredVercel = vercelCandidates[0];
  if (preferredVercel) return preferredVercel;

  const fallbackExplicit = explicitCandidates[0];
  if (fallbackExplicit) return fallbackExplicit;

  return "http://localhost:3000";
}

export const env = {
  DATABASE_URL: req("DATABASE_URL"),
  APP_BASE_URL: resolveAppBaseUrl(),
  APP_NAME: req("APP_NAME"),
  VENUE_NAME: req("VENUE_NAME"),
  SUPPORT_EMAIL: req("SUPPORT_EMAIL"),

  JWT_SECRET: req("JWT_SECRET"),
  QR_HMAC_SECRET: req("QR_HMAC_SECRET"),
  WEBHOOK_HMAC_SECRET: process.env.WEBHOOK_HMAC_SECRET || "",

  // Email
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "smtp", // default to smtp for you
  EMAIL_FROM: req("EMAIL_FROM"),

  // Resend (optional)
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: process.env.SMTP_PORT || "",
  SMTP_SECURE: process.env.SMTP_SECURE || "",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",

  SUPABASE_URL: req("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: req("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_STORAGE_BUCKET: req("SUPABASE_STORAGE_BUCKET"),

  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "mock"
};

