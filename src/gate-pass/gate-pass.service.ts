// src/gate-pass/gate-pass.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { GatePassRepository } from './gate-pass.repository';
import { GatePassResponseDto } from './dto/gate-pass-response.dto';
import { GatePassStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class GatePassService {
  constructor(private readonly gatePassRepository: GatePassRepository) {}

  async generatePass(visitorRequestId: string, expiresAt: Date): Promise<GatePassResponseDto> {
    const passCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const qrToken = randomBytes(32).toString('hex');

    const pass = await this.gatePassRepository.create({
      visitorRequestId,
      passCode,
      qrToken,
      expiresAt,
      status: GatePassStatus.APPROVED,
    });

    return pass as unknown as GatePassResponseDto;
  }

  async validatePass(codeOrToken: string): Promise<GatePassResponseDto> {
    const pass = await this.gatePassRepository.findByPassCodeOrToken(codeOrToken);
    
    if (!pass) {
      throw new NotFoundException('Gate pass not found.');
    }

    if (pass.status !== GatePassStatus.APPROVED) {
      throw new BadRequestException(`Gate pass is ${pass.status}.`);
    }

    if (new Date() > pass.expiresAt) {
      await this.gatePassRepository.update(pass.id, { status: GatePassStatus.EXPIRED });
      throw new BadRequestException('Gate pass has expired.');
    }

    return pass as unknown as GatePassResponseDto;
  }
}
