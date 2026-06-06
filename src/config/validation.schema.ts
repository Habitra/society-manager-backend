// src/config/validation.schema.ts
// ============================================================
// Joi schema for environment variable validation.
// Validated before the app boots — fails fast on misconfiguration.
// ============================================================

import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),

  // Supabase — all required
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_JWT_SECRET: Joi.string().required(),

  // Database
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),

  // Throttle
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // External integrations — optional in development
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().optional(),

  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),

  MSG91_AUTH_KEY: Joi.string().optional(),
  MSG91_SENDER_ID: Joi.string().default('SCTMGR'),
  MSG91_TEMPLATE_ID: Joi.string().optional(),

  RESEND_API_KEY: Joi.string().optional(),
  RESEND_FROM_EMAIL: Joi.string().email().default('noreply@societymanager.in'),
});
