// src/config/configuration.ts
// ============================================================
// Typed configuration factory.
// @nestjs/config loads this and makes it available via ConfigService.
// All env variables are validated by Joi before the app boots.
// ============================================================

/**
 * Reads a required environment variable and throws immediately at module
 * load time if it is absent or shorter than minLength characters.
 *
 * This is the second layer of security after Joi validation — Joi catches
 * missing vars at NestJS bootstrap, but requireEnv() catches them at the
 * moment this module is first imported, before any DI container is built.
 *
 * Never supply a default value for secrets — silence is better than a
 * predictable fallback that could accidentally reach production.
 */
function requireEnv(key: string, minLength = 1): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[SECURITY] Required environment variable "${key}" is missing or empty. ` +
      `Generate a value with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  if (value.length < minLength) {
    throw new Error(
      `[SECURITY] Environment variable "${key}" is too short (${value.length} chars). ` +
      `Minimum required length is ${minLength} characters.`,
    );
  }
  return value;
}

export const configuration = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    isProduction: process.env.NODE_ENV === 'production',
    swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
      .split(',')
      .map((o) => o.trim()),
  },

  auth: {
    // requireEnv() throws at module load if secret is missing or < 32 chars.
    // Never add a fallback default here — a missing secret must crash the app.
    jwtSecret: requireEnv('JWT_SECRET', 32),
    jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET', 32),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 10),
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES ?? '15', 10),
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  database: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL!,
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  msg91: {
    authKey: process.env.MSG91_AUTH_KEY,
    senderId: process.env.MSG91_SENDER_ID ?? 'SCTMGR',
    templateId: process.env.MSG91_TEMPLATE_ID,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? 'noreply@societymanager.in',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
