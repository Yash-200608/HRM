const nodemailer = require("nodemailer");

const DEFAULT_FROM_EMAIL = "no-reply@example.com";
const RESEND_API_URL = "https://api.resend.com/emails";

let gmailTransporter = null;

function resolveFromEmail() {
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

async function sendViaResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: resolveFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      text: text || undefined,
      html: html || undefined,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `Resend request failed with status ${response.status}`);
  }

  return {
    success: true,
    provider: "resend",
    messageId: body?.id || null,
  };
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