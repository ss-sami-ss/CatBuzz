import { createTransport } from "nodemailer";

export type EmailMessage = { to: string; subject: string; text: string };

/** Provider adapter (D04/D12): local Mailpit today, an SMTP provider reachable from Iran in production. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("EMAIL_SMTP_URL is not set");
    this.name = "EmailNotConfiguredError";
  }
}

export function createSmtpSender(smtpUrl: string | undefined, from: string): EmailSender {
  if (!smtpUrl) {
    return {
      async send() {
        throw new EmailNotConfiguredError();
      },
    };
  }
  const transport = createTransport(smtpUrl);
  return {
    async send(message) {
      await transport.sendMail({ from, to: message.to, subject: message.subject, text: message.text });
    },
  };
}

export function activationEmail(code: string, purpose: "sign_up" | "sign_in", minutes: number): Omit<EmailMessage, "to"> {
  const action = purpose === "sign_up" ? "ساخت حساب" : "ورود";
  return {
    subject: `کد ${action} در CatBuzz: ${code}`,
    text: [
      `کد ${action} شما در CatBuzz:`,
      "",
      code,
      "",
      `این کد ${minutes} دقیقه اعتبار دارد و فقط یک بار قابل استفاده است.`,
      "اگر این درخواست را شما نفرستاده‌اید، این ایمیل را نادیده بگیرید.",
    ].join("\n"),
  };
}
