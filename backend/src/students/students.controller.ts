import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { ImportStudentRecordDto, ImportStudentsDto } from './dto/import-students.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Roles(UserRole.ADMIN, UserRole.LECTURER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentQueryDto) {
    return this.studentsService.findAll(user, query);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Post('import')
  importStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportStudentsDto | ImportStudentRecordDto[],
  ) {
    return this.studentsService.importStudents(body, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentsService.findOne(user, id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentsService.deactivate(id, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/reactivate')
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.studentsService.reactivate(id, user.id);
  }
}
