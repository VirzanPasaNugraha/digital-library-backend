// server/src/utils/mailer.js
import nodemailer from "nodemailer";

function env(name, fallback = "") {
  return process.env[name] ?? fallback;
}

function toBool(v) {
  return String(v).toLowerCase() === "true";
}

export const transporter = nodemailer.createTransport({
  host: env("MAIL_HOST"),
  port: Number(env("MAIL_PORT", "465")),
  secure: toBool(env("MAIL_SECURE", "true")), // true untuk 465, false untuk 587
  auth: {
    user: env("MAIL_USER"),
    pass: env("MAIL_PASS"),
  },
});

export async function sendMail({ to, subject, text, html }) {
  const from = env("MAIL_FROM") || env("MAIL_USER");
  if (!to) throw new Error("sendMail: 'to' kosong");

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

// opsional tapi sangat berguna: cek koneksi smtp saat server start
export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("[MAIL] SMTP ready:", env("MAIL_HOST"), env("MAIL_USER"));
  } catch (e) {
    console.error("[MAIL] SMTP verify failed:", e);
  }
}
