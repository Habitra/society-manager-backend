import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OccupancyType, UserStatus } from '@prisma/client';

export class AssignedUnitDto {
  @ApiProperty() unitId!: string;
  @ApiProperty() unitNumber!: string;
  @ApiPropertyOptional() towerName?: string;
  @ApiProperty({ enum: OccupancyType }) occupancyType!: OccupancyType;
  @ApiProperty() isPrimary!: boolean;
}

export class ResidentProfileDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() occupation?: string | null;
  @ApiPropertyOptional() dateOfBirth?: Date | null;
  @ApiProperty() vehicleCount!: number;
  @ApiProperty() isCommitteeMember!: boolean;
  @ApiProperty() verificationStage!: string;
}

export class ResidentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty() firstLoginCompleted!: boolean;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiPropertyOptional() lastLoginAt?: Date | null;
  @ApiPropertyOptional() lockedUntil?: Date | null;
  @ApiProperty() failedLoginAttempts!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiProperty({ type: () => ResidentProfileDto })
  profile!: ResidentProfileDto;

  @ApiProperty({ type: () => [AssignedUnitDto] })
  assignedUnits!: AssignedUnitDto[];
}

export class ResidentCredentialsResponseDto {
  @ApiProperty({ type: () => ResidentResponseDto })
  resident!: ResidentResponseDto;

  @ApiProperty()
  credentials!: {
    username: string;
    temporaryPassword?: string;
  };
}
