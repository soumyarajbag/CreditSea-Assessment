import dotenv from 'dotenv';

dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:3000';
const emailVerificationUrl = process.env.EMAIL_VERIFICATION_URL?.trim() || `${frontendUrl.split(',')[0].trim()}/verify-email`;
const configuredVerificationHours = Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS ?? 24);
const emailVerificationExpiresHours =
  Number.isFinite(configuredVerificationHours) && configuredVerificationHours > 0 ? Math.floor(configuredVerificationHours) : 24;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/creditsea_lms'),
  jwtSecret: required('JWT_SECRET', 'development-only-change-this-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  frontendUrl,
  emailVerificationUrl,
  emailVerificationExpiresHours,
  smtpHost: process.env.SMTP_HOST?.trim() ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER?.trim() ?? '',
  smtpPassword: process.env.SMTP_PASSWORD ?? '',
  smtpFrom: process.env.SMTP_FROM?.trim() ?? process.env.SMTP_USER?.trim() ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? '',
};
