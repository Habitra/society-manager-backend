// src/common/filters/global-exception.filter.ts
// ============================================================
// Global exception filter — normalises ALL error types into a
// consistent JSON response shape:
//
// {
//   "success": false,
//   "error": {
//     "code": "VALIDATION_ERROR",
//     "message": "Human-readable message",
//     "details": [...] // optional field-level errors
//   },
//   "meta": {
//     "timestamp": "...",
//     "path": "/api/v1/...",
//     "requestId": "..."
//   }
// }
//
// Handles: HttpException, Prisma errors, generic errors.
// In production, internal server error details are hidden.
// ============================================================

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.resolveException(exception);

    const errorResponse: ErrorResponse = {
      success: false,
      error: { code, message, details },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.headers['x-request-id'] as string | undefined,
      },
    };

    // Always log 5xx errors
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} — ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(`[${status}] ${request.method} ${request.url} — ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    // ─── NestJS HttpException ───────────────────────────────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        // NestJS validation pipe errors have { message: string[], error: string }
        return {
          status,
          code: this.statusToCode(status),
          message: Array.isArray(obj.message)
            ? 'Validation failed'
            : (obj.message as string) || exception.message,
          details: Array.isArray(obj.message) ? obj.message : undefined,
        };
      }

      return { status, code: this.statusToCode(status), message: String(res) };
    }

    // ─── Prisma Known Request Error ─────────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    // ─── Prisma Validation Error ─────────────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: this.isProduction ? 'Invalid request data' : exception.message,
      };
    }

    // ─── Generic / Unknown errors ────────────────────────────────────────────
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: this.isProduction ? 'An unexpected error occurred' : String(exception),
    };
  }

  private resolvePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = (error.meta?.target as string[])?.join(', ') ?? 'field';
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_ENTRY',
          message: `A record with this ${fields} already exists`,
        };
      }
      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'The requested record was not found',
        };
      case 'P2003':
        // Foreign key constraint failure
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist',
        };
      case 'P2014':
        // Relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'RELATION_VIOLATION',
          message: 'This operation would violate a relation constraint',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: this.isProduction ? 'A database error occurred' : error.message,
        };
    }
  }

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] ?? `HTTP_${status}`;
  }
}
