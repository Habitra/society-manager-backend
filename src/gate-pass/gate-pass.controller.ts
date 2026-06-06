// src/gate-pass/gate-pass.controller.ts
import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { GatePassService } from './gate-pass.service';
import { GatePassResponseDto } from './dto/gate-pass-response.dto';
import { ValidatePassDto } from './dto/validate-pass.dto';

@ApiTags('Gate Passes')
@ApiBearerAuth()
@Controller('gate-passes')
export class GatePassController {
  constructor(private readonly gatePassService: GatePassService) {}

  @Post('validate')
  @Roles(UserRole.GUARD, UserRole.MANAGER, UserRole.COMMUNITY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a gate pass by QR token or pass code' })
  @ApiOkResponse({ type: GatePassResponseDto })
  async validatePass(@Body() dto: ValidatePassDto): Promise<GatePassResponseDto> {
    return this.gatePassService.validatePass(dto.codeOrToken);
  }
}
