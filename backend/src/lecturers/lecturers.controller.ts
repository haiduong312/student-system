import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('lecturers')
@ApiBearerAuth()
@Controller('lecturers')
export class LecturersController {}
