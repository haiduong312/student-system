import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { LecturerQueryDto } from './dto/lecturer-query.dto';
import { UpdateLecturerDto } from './dto/update-lecturer.dto';
import { LecturersService } from './lecturers.service';

@ApiTags('lecturers')
@ApiBearerAuth()
@Controller('lecturers')
export class LecturersController {
  constructor(private readonly lecturersService: LecturersService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() query: LecturerQueryDto) {
    return this.lecturersService.findAll(query);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLecturerDto) {
    return this.lecturersService.create(dto, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER)
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.lecturersService.findOne(user, id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLecturerDto,
  ) {
    return this.lecturersService.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.lecturersService.deactivate(id, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/reactivate')
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.lecturersService.reactivate(id, user.id);
  }
}
