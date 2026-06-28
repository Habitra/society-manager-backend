// src/main.ts
// ============================================================
// NestJS application bootstrap.
//
// Sets up:
//   - Global validation pipe (class-validator)
//   - CORS with environment-defined origins
//   - Helmet security headers
//   - API versioning prefix
//   - Swagger UI (disabled in production)
//   - Graceful shutdown hooks
// ============================================================

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AppConfig } from './config/configuration';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  const appConfig = configService.get('app', { infer: true });

  // ─── Security Headers ──────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: appConfig.isProduction,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─── CORS ──────────────────────────────────────────────────────────────
  app.enableCors({
    origin: appConfig.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  // ─── Global API prefix ─────────────────────────────────────────────────
  app.setGlobalPrefix(appConfig.apiPrefix);

  // ─── Global Validation Pipe ────────────────────────────────────────────
  // whitelist: strip unknown properties
  // forbidNonWhitelisted: throw if unknown props sent
  // transform: auto-convert query params to their declared types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────
  if (appConfig.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Society Manager API')
      .setDescription(
        `
## Society Management SaaS — Phase 1 API

**Base URL:** \`/${appConfig.apiPrefix}\`

### Authentication
All endpoints require a Bearer token from Supabase Auth, except those marked as \`Public\`.

Include the token in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <supabase-jwt-token>
\`\`\`

### Multi-Tenant Design
All data is automatically scoped to your community. The \`community_id\` is resolved from your JWT token — you do not need to pass it explicitly.

### Response Format
All responses follow the standard envelope:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "...", "requestId": "..." }
}
\`\`\`
      `,
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' })
      .addTag('Health', 'Health check and API info')
      .addTag('Auth', 'Authentication and session management')
      .addTag('Community', 'Community management (admin only)')
      .addTag('Users', 'User and profile management')
      .addTag('Units', 'Unit and tower management')
      .addTag('Visitors', 'Visitor invites and gate passes')
      .addTag('Maintenance', 'Maintenance tickets and complaints')
      .addTag('Billing', 'Invoice cycles, invoices and payments')
      .addTag('Announcements', 'Community announcements and notices')
      .addTag('Audit', 'Audit log access')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: false,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        filter: true,
        showExtensions: true,
      },
      customSiteTitle: 'Society Manager API Docs',
    });

    console.log(`📚 Swagger UI available at: http://localhost:${appConfig.port}/docs`);
  }

  // ─── Prisma Graceful Shutdown ──────────────────────────────────────────
  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  // ─── Production Startup Guard ─────────────────────────────────────────
  // Double-check that critical secrets are not placeholder values.
  // requireEnv() in configuration.ts already handles missing vars;
  // this guard catches cases where vars are set but contain dummy values.
  if (appConfig.isProduction) {
    const jwtSecret = configService.get('auth.jwtSecret', { infer: true });
    const jwtRefreshSecret = configService.get('auth.jwtRefreshSecret', { infer: true });
    if (!jwtSecret || jwtSecret.length < 32 || !jwtRefreshSecret || jwtRefreshSecret.length < 32) {
      console.error('[SECURITY] JWT secrets do not meet minimum length requirements. Refusing to start in production.');
      process.exit(1);
    }
  }

  // ─── Start Server ──────────────────────────────────────────────────────
  await app.listen(appConfig.port);

  console.log(`
🚀 Society Manager API started
   Environment : ${appConfig.nodeEnv}
   Port        : ${appConfig.port}
   Prefix      : /${appConfig.apiPrefix}
   Swagger     : ${appConfig.swaggerEnabled ? `http://localhost:${appConfig.port}/docs` : 'disabled'}
  `);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
