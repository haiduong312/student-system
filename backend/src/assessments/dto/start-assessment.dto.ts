import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StartAssessmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  careerGoalId: string;
}
