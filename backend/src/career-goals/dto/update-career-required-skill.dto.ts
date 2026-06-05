import { PartialType } from '@nestjs/swagger';
import { CreateCareerRequiredSkillDto } from './create-career-required-skill.dto';

export class UpdateCareerRequiredSkillDto extends PartialType(
  CreateCareerRequiredSkillDto,
) {}
