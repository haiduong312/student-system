import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {}
