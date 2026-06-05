import { PartialType } from '@nestjs/swagger';
import { CreateAdvisorAssignmentDto } from './create-advisor-assignment.dto';

export class UpdateAdvisorAssignmentDto extends PartialType(
  CreateAdvisorAssignmentDto,
) {}
