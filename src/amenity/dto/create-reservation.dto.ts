import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  @IsNotEmpty()
  amenityId: string;

  @IsDateString()
  @IsNotEmpty()
  bookingDate: string; // ISO date string

  @IsString()
  @IsNotEmpty()
  startTime: string; // "HH:mm"

  @IsString()
  @IsNotEmpty()
  endTime: string; // "HH:mm"

  @IsString()
  @IsOptional()
  notes?: string;
}
