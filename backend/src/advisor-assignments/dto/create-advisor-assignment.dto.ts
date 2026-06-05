import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAdvisorAssignmentDto {
  @ApiProperty()
  @IsString()
  lecturerId: string;

  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiPropertyOptional({ enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
