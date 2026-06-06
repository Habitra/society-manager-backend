// test/app.e2e-spec.ts
// ============================================================
// End-to-end test for the application bootstrap.
// Verifies the health check endpoint returns 200 without auth.
// ============================================================

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health (public)', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      expect(response.body.data).toMatchObject({
        status: 'ok',
      });
    });
  });

  describe('GET /api/v1/protected (requires auth)', () => {
    it('should return 401 without a token', async () => {
      // Any route without @Public() should reject unauthenticated requests
      await request(app.getHttpServer())
        .get('/api/v1/units') // Will be added in Phase 1 feature modules
        .expect(401);
    });
  });
});
