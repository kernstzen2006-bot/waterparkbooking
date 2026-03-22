function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: req("DATABASE_URL"),
  APP_BASE_URL: req("APP_BASE_URL"),
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

