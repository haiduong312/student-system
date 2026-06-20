import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillsService } from './skills.service';

@ApiTags('skills')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @ApiCreatedResponse({ description: 'Skill created' })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSkillDto,
  ) {
    return this.skillsService.create(dto, user.id);
  }

  @ApiOkResponse({ description: 'Paginated skills' })
  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SkillQueryDto,
  ) {
    return this.skillsService.findAll(query, {
      activeOnly: user.role !== UserRole.ADMIN,
    });
  }

  @ApiOkResponse({ description: 'Skill detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @ApiOkResponse({ description: 'Skill updated' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.skillsService.update(id, dto, user.id);
  }

  @ApiOkResponse({ description: 'Skill deleted' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.skillsService.remove(id, user.id);
  }
}
