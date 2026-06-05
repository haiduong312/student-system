import { PartialType } from '@nestjs/swagger';
import { CreateCareerGoalDto } from './create-career-goal.dto';

export class UpdateCareerGoalDto extends PartialType(CreateCareerGoalDto) {}
