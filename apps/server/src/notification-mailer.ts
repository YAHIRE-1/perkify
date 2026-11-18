import type { NotificationMailer } from "@perkify/api/lib/notification-mail";
import nodemailer from "nodemailer";
import { ENV } from "./env";

function createNotificationMailer(): NotificationMailer | undefined {
  const { SMTP_HOST: host, SMTP_FROM: from, SMTP_PORT: port, SMTP_USER: user, SMTP_PASS: pass } = ENV;

  if (!host || !from || Boolean(user) !== Boolean(pass)) {
    if (host || from || user || pass || port) {
      console.warn("SMTP disabled. Set SMTP_HOST and SMTP_FROM, and configure both credentials or neither.");
    }
    return;
  }

  const security = ENV.SMTP_SECURITY ?? ((ENV.SMTP_SECURE ?? (port === 465)) ? "tls" : "starttls");
  const plain = security === "plain";
  if (plain && (ENV.NODE_ENV !== "development" || user)) {
    console.warn("SMTP disabled. Plain SMTP is limited to local development without credentials.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: port ?? (plain ? 1025 : security === "tls" ? 465 : 587),
    secure: security === "tls",
    requireTLS: security === "starttls",
    ignoreTLS: plain,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
    dnsTimeout: 5_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  }, { from });

  return async (message) => {
    await transporter.sendMail(message);
  };
}

export const notificationMailer = createNotificationMailer();
