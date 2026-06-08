import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceCategoryRepository } from './maintenance-category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MaintenanceRepository } from './maintenance.repository';

@Injectable()
export class MaintenanceCategoryService {
  constructor(
    private readonly categoryRepository: MaintenanceCategoryRepository,
    private readonly ticketRepository: MaintenanceRepository,
  ) {}

  async createCategory(dto: CreateCategoryDto) {
    return this.categoryRepository.create(dto as unknown as Record<string, unknown>);
  }

  async getCategories() {
    return this.categoryRepository.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCategoryById(id: string) {
    return this.categoryRepository.findById(id);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.categoryRepository.update(id, dto as unknown as Record<string, unknown>);
  }

  async deleteCategory(id: string) {
    // Prevent deletion if active tickets exist
    const openTicketsCount = await this.ticketRepository.count({
      where: {
        categoryId: id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'REOPENED'] },
      },
    });

    if (openTicketsCount > 0) {
      throw new BadRequestException('Cannot delete category with active tickets.');
    }

    // Soft delete by updating isActive
    // Wait, the schema does not have deletedAt for MaintenanceCategory!
    // It only has isActive. So we will set isActive = false.
    return this.categoryRepository.update(id, { isActive: false });
  }
}
