import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectEvidenceDto {
  @ApiProperty({ example: 'The uploaded file does not prove this skill.' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reviewerNote: string;
}
