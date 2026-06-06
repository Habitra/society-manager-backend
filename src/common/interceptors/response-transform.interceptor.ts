// src/common/interceptors/response-transform.interceptor.ts
// ============================================================
// Global response transformation interceptor.
//
// Wraps ALL successful responses in a consistent envelope:
// {
//   "success": true,
//   "data": <original response>,
//   "meta": {
//     "timestamp": "...",
//     "requestId": "..."
//   }
// }
//
// Preserves the original structure if the response is already in
// { success, data, meta } shape (e.g. paginated responses from services).
// ============================================================

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string | undefined;

    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped (e.g. from PaginatedResult), merge meta
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          const wrapped = data as unknown as ApiResponse<unknown>;
          return {
            ...wrapped,
            meta: {
              ...wrapped.meta,
              timestamp: new Date().toISOString(),
              requestId,
            },
          } as unknown as ApiResponse<T>;
        }

        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        };
      }),
    );
  }
}
