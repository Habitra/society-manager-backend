// src/gate-entry/gate-entry.controller.ts
import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { GateEntryService } from './gate-entry.service';
import { RecordEntryDto } from './dto/record-entry.dto';
import { GateEntryResponseDto } from './dto/gate-entry-response.dto';

@ApiTags('Gate Entries')
@ApiBearerAuth()
@Controller('gate-entries')
export class GateEntryController {
  constructor(private readonly gateEntryService: GateEntryService) {}

  @Post()
  @Roles(UserRole.GUARD, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a visitor entry' })
  @ApiCreatedResponse({ type: GateEntryResponseDto })
  async recordEntry(
    @Body() dto: RecordEntryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<GateEntryResponseDto> {
    return this.gateEntryService.recordEntry(dto, user.id);
  }

  @Patch(':id/exit')
  @Roles(UserRole.GUARD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Record a visitor exit' })
  @ApiOkResponse({ type: GateEntryResponseDto })
  async recordExit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<GateEntryResponseDto> {
    return this.gateEntryService.recordExit(id, user.id);
  }
}
