// src/app.controller.ts
// ============================================================
// Root controller — provides health check and API info endpoints.
// These are @Public() and do NOT require authentication.
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API info', description: 'Returns API name and version' })
  getInfo(): object {
    return {
      name: 'Society Manager API',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Used by Railway / uptime monitors' })
  healthCheck(): object {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };
  }
}
