import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceCategoryService } from './maintenance-category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@ApiTags('Maintenance Categories')
@ApiBearerAuth()

@Controller('maintenance/categories')
export class MaintenanceCategoryController {
  constructor(private readonly categoryService: MaintenanceCategoryService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)
  @AuditLog({ table: 'maintenance_categories', action: AuditAction.CREATE, captureBody: true })
  @ApiOperation({ summary: 'Create a new maintenance category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @AuthenticatedOnly()
  @Get()
  @ApiOperation({ summary: 'List all maintenance categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories() {
    return this.categoryService.getCategories();
  }

  @AuthenticatedOnly()
  @Get(':id')
  @ApiOperation({ summary: 'Get category details' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async getCategoryById(@Param('id') id: string) {
    return this.categoryService.getCategoryById(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)
  @AuditLog({ table: 'maintenance_categories', action: AuditAction.UPDATE, captureBody: true })
  @ApiOperation({ summary: 'Update a maintenance category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.SUPER_ADMIN)
  @AuditLog({ table: 'maintenance_categories', action: AuditAction.SOFT_DELETE })
  @ApiOperation({ summary: 'Soft delete a maintenance category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category soft deleted' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
