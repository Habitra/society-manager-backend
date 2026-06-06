// src/tower/dto/update-tower.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTowerDto } from './create-tower.dto';

export class UpdateTowerDto extends PartialType(CreateTowerDto) {}
