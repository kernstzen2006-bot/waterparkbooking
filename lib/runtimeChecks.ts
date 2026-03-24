import { env } from "@/lib/env";

function safeTarget(raw: string): string {
  try {
    const url = new URL(raw);
    const pathname = url.pathname.replace(/^\/+/, "");
    return pathname ? `${url.host}/${pathname}` : url.host;
  } catch {
    return "invalid";
  }
}

export function getPublicRuntimeSnapshot() {
  const emailProvider = (env.EMAIL_PROVIDER || "smtp").toLowerCase();

  return {
    appBaseUrl: env.APP_BASE_URL,
    databaseTarget: safeTarget(env.DATABASE_URL),
    storageTarget: safeTarget(env.SUPABASE_URL),
    storageBucket: env.SUPABASE_STORAGE_BUCKET,
    vercelEnv: process.env.VERCEL_ENV || "local",
    emailProvider,
    smtpReady: Boolean(env.EMAIL_FROM && env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS),
    resendReady: Boolean(env.EMAIL_FROM && env.RESEND_API_KEY),
  };
}
