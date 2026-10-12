import crypto from 'node:crypto';

import nodemailer, { Transporter } from 'nodemailer';

import { env } from '../config/env';
import { AppError } from '../utils/app-error';

const VERIFICATION_TOKEN_BYTES = 32;

let transporter: Transporter | undefined;

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character,
  );

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword || !env.smtpFrom) {
    throw new AppError(
      503,
      'Email verification is not configured. Add SMTP settings to the backend environment.',
      'EMAIL_SERVICE_NOT_CONFIGURED',
    );
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword,
    },
  });

  return transporter;
};

export const createVerificationToken = (): string => crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');

export const hashVerificationToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export const getVerificationExpiry = (): number => Date.now() + Math.max(1, env.emailVerificationExpiresHours) * 60 * 60 * 1000;

export const sendVerificationEmail = async (recipient: string, token: string): Promise<void> => {
  const verificationUrl = `${env.emailVerificationUrl}${env.emailVerificationUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  const safeRecipient = escapeHtml(recipient);
  const expiryHours = Math.max(1, env.emailVerificationExpiresHours);
  const mailTransporter = getTransporter();

  try {
    await mailTransporter.sendMail({
      from: env.smtpFrom,
      to: recipient,
      subject: 'Verify your CreditSea email address',
      text: `Welcome to CreditSea. Verify your email address by opening this link: ${verificationUrl}\n\nThis link expires in ${expiryHours} hours.`,
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Verify your CreditSea email</title>
          </head>
          <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:36px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.12);">
                    <tr>
                      <td style="background:#0f172a;padding:32px 40px;">
                        <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:#ffffff;">Credit<span style="color:#60a5fa;">Sea</span></div>
                        <div style="margin-top:12px;color:#bfdbfe;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;">Loan management, made clearer</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:42px 40px 36px;">
                        <div style="display:inline-block;background:#ecfdf5;color:#047857;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;">One last step</div>
                        <h1 style="margin:20px 0 12px;font-size:30px;line-height:1.2;letter-spacing:-.8px;color:#0f172a;">Confirm your email address</h1>
                        <p style="margin:0;color:#475569;font-size:16px;line-height:1.7;">Thanks for creating a CreditSea borrower account. Confirm <strong style="color:#172033;">${safeRecipient}</strong> to activate your account and continue to your application workspace.</p>
                        <div style="padding:30px 0;text-align:center;">
                          <a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;padding:15px 25px;font-size:15px;font-weight:700;">Verify my email</a>
                        </div>
                        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.7;">This verification link expires in ${expiryHours} hours. If you did not create this account, you can safely ignore this email.</p>
                        <div style="margin-top:26px;border-top:1px solid #e2e8f0;padding-top:20px;">
                          <p style="margin:0 0 8px;color:#64748b;font-size:12px;">If the button does not work, copy and paste this link into your browser:</p>
                          <a href="${verificationUrl}" style="color:#2563eb;font-size:12px;line-height:1.6;word-break:break-all;">${verificationUrl}</a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f8fafc;padding:22px 40px;color:#94a3b8;font-size:12px;line-height:1.6;">This is an automated message from CreditSea. Please do not reply to this email.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Verification email delivery failed.', error);
    throw new AppError(502, 'We could not send the verification email. Please try again.', 'EMAIL_DELIVERY_FAILED');
  }
};
