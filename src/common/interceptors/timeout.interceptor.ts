// src/common/interceptors/timeout.interceptor.ts
// ============================================================
// Request timeout interceptor.
// Throws RequestTimeoutException if a handler takes longer than
// TIMEOUT_MS (default: 10 seconds).
// Prevents runaway queries from holding connections indefinitely.
// ============================================================

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

const TIMEOUT_MS = 10_000; // 10 seconds

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(TIMEOUT_MS),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timed out after 10 seconds'));
        }
        return throwError(() => err);
      }),
    );
  }
}
