import nodemailer from 'nodemailer';

export function makeTransport() {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP no configurado (.env SMTP_HOST/PORT/USER/PASS)');
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  });
}

export async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = makeTransport();
  const from = process.env.SMTP_FROM || '"ATIX" <no-reply@atix.com>';
  return transporter.sendMail({ from, to, subject, html, attachments });
}
