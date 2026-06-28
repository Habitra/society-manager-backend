import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Scope } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { UserRole } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class TenantInterceptor implements NestInterceptor {
  constructor(private tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      if (user.role !== UserRole.SUPER_ADMIN && user.communityId) {
        this.tenantContext.communityId = user.communityId;
      }
      this.tenantContext.userId = user.id;
    }

    return next.handle();
  }
}
