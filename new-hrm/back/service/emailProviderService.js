const nodemailer = require("nodemailer");
const { Resend } = require("resend");

const DEFAULT_FROM_EMAIL = "no-reply@example.com";

let gmailTransporter = null;
let resendInstance = null;

function resolveFromEmail() {
  // Per Resend guidelines: For production, `from` must use a domain you have verified
  // at https://resend.com/domains. Do not use unverified addresses (e.g. @gmail.com)
  // or the test address onboarding@resend.dev in real deployments.
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    DEFAULT_FROM_EMAIL
  );
}

function resolveProvider() {
  const configured = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  if (configured === "resend" || configured === "gmail" || configured === "nodemailer") {
    return configured === "nodemailer" ? "gmail" : configured;
  }

  if (process.env.RESEND_API_KEY) {
    return "resend";
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return "gmail";
  }

  return "none";
}

function getGmailTransporter() {
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return gmailTransporter;
}

async function sendViaResend(payload = {}) {
  const resend = getResendClient();
  const from = resolveFromEmail();

  const { to, subject, text, html, ...rest } = payload;

  // Official Resend Node.js SDK usage (per strict guidelines).
  // Always use camelCase parameters (replyTo, scheduledAt, idempotencyKey, etc.).
  // The SDK returns { data, error } — check error instead of throwing for Resend errors.
  const sendOptions = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
    ...rest,
  };

  const { data, error } = await resend.emails.send(sendOptions);

  if (error) {
    return {
      success: false,
      provider: "resend",
      error: error.message || "Resend error",
    };
  }

  return {
    success: true,
    provider: "resend",
    messageId: data?.id || null,
  };
}

function getResendClient() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

async function sendViaGmail({ to, subject, text, html }) {
  const transporter = getGmailTransporter();
  const info = await transporter.sendMail({
    from: `"HRM Platform" <${resolveFromEmail()}>`,
    to,
    subject,
    text: text || "",
    html: html || "",
  });

  return {
    success: true,
    provider: "gmail",
    messageId: info.messageId,
  };
}

async function sendPlatformEmail(payload) {
  const provider = resolveProvider();

  if (provider === "none") {
    return {
      success: false,
      provider: "none",
      error: "No email provider configured",
    };
  }

  try {
    if (provider === "resend") {
      return await sendViaResend(payload);
    }

    return await sendViaGmail(payload);
  } catch (error) {
    if (provider === "resend" && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const fallback = await sendViaGmail(payload);
        return { ...fallback, fallbackFrom: "resend" };
      } catch (fallbackError) {
        return {
          success: false,
          provider,
          error: fallbackError.message,
        };
      }
    }

    return {
      success: false,
      provider,
      error: error.message,
    };
  }
}

module.exports = {
  resolveFromEmail,
  resolveProvider,
  sendPlatformEmail,
};