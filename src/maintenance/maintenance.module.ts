import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceCategoryController } from './maintenance-category.controller';
import { MaintenanceCategoryService } from './maintenance-category.service';
import { MaintenanceCategoryRepository } from './maintenance-category.repository';
import { MaintenanceCommentController } from './maintenance-comment.controller';
import { MaintenanceCommentService } from './maintenance-comment.service';
import { MaintenanceCommentRepository } from './maintenance-comment.repository';
import { MaintenanceAttachmentController } from './maintenance-attachment.controller';
import { MaintenanceAttachmentService } from './maintenance-attachment.service';
import { MaintenanceAttachmentRepository } from './maintenance-attachment.repository';
import { ResidentAssignmentModule } from '../resident-assignment/resident-assignment.module';
import { AuditModule } from '../audit/audit.module';

import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ResidentAssignmentModule, AuditModule, TenantModule, PrismaModule],
  controllers: [
    MaintenanceCategoryController,
    MaintenanceAttachmentController,
    MaintenanceCommentController,
    MaintenanceController,
  ],
  providers: [
    MaintenanceCategoryRepository,
    MaintenanceCategoryService,
    MaintenanceAttachmentRepository,
    MaintenanceAttachmentService,
    MaintenanceCommentRepository,
    MaintenanceCommentService,
    MaintenanceRepository,
    MaintenanceService,
  ],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
