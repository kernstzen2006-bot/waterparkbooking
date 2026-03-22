import { env } from "@/lib/env";
import { Resend } from "resend";
import nodemailer from "nodemailer";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  attachmentName: string;
  attachmentBytes: Uint8Array;
};

let resendClient: Resend | null | undefined;
let smtpTransport: nodemailer.Transporter | null | undefined;

function getResend() {
  if (resendClient !== undefined) return resendClient;
  resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  return resendClient;
}

function getSmtpTransport() {
  if (smtpTransport !== undefined) return smtpTransport;
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    smtpTransport = null;
    return smtpTransport;
  }

  const port = Number(env.SMTP_PORT);
  const secure = String(env.SMTP_SECURE).toLowerCase() === "true";

  smtpTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    pool: true,
    secure,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  return smtpTransport;
}

export async function sendTicketsEmail(args: SendArgs) {
  const provider = (env.EMAIL_PROVIDER || "").toLowerCase();
  const hasAttachment = !!args.attachmentBytes && args.attachmentBytes.length > 0;

  if (provider === "smtp") {
    const transport = getSmtpTransport();
    if (!transport) {
      console.warn("[email] SMTP not configured; email not sent.");
      return;
    }

    console.log("[email] SMTP send", {
      to: args.to,
      from: env.EMAIL_FROM,
      subject: args.subject,
      hasAttachment,
    });

    const info = await transport.sendMail({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      attachments: hasAttachment
        ? [
            {
              filename: args.attachmentName,
              content: Buffer.from(args.attachmentBytes),
              contentType: "application/pdf",
            },
          ]
        : [],
    });

    console.log("[email] SMTP accepted:", {
      messageId: info.messageId,
      response: info.response,
    });

    return;
  }

  if (provider === "resend") {
    const resend = getResend();
    if (!resend) {
      console.warn("[email] RESEND_API_KEY not set; email not sent.");
      return;
    }

    console.log("[email] Resend send", {
      to: args.to,
      from: env.EMAIL_FROM,
      subject: args.subject,
      hasAttachment,
    });

    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      attachments: hasAttachment
        ? [
            {
              filename: args.attachmentName,
              content: Buffer.from(args.attachmentBytes).toString("base64"),
            },
          ]
        : [],
    });

    console.log("[email] Resend accepted");
    return;
  }

  console.warn(`[email] EMAIL_PROVIDER not set or unsupported ("${env.EMAIL_PROVIDER}"); email not sent.`);
}
