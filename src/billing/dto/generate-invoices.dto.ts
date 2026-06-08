import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class CustomLineItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class GenerateInvoicesDto {
  @ApiPropertyOptional({ type: [CustomLineItemDto], description: 'Additional line items to add to every generated invoice' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomLineItemDto)
  additionalLineItems?: CustomLineItemDto[];
}
