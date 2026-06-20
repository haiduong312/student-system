import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CareerGoalQueryDto } from './dto/career-goal-query.dto';
import { CareerRequiredSkillQueryDto } from './dto/career-required-skill-query.dto';
import { CreateCareerGoalDto } from './dto/create-career-goal.dto';
import { CreateCareerRequiredSkillDto } from './dto/create-career-required-skill.dto';
import { UpdateCareerGoalDto } from './dto/update-career-goal.dto';
import { UpdateCareerRequiredSkillDto } from './dto/update-career-required-skill.dto';
import { CareerGoalsService } from './career-goals.service';

@ApiTags('career-goals')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('career-goals')
export class CareerGoalsController {
  constructor(private readonly careerGoalsService: CareerGoalsService) {}

  @ApiCreatedResponse({ description: 'Career goal created' })
  @Roles(UserRole.ADMIN, UserRole.LECTURER)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCareerGoalDto,
  ) {
    return this.careerGoalsService.create(dto, user.id);
  }

  @ApiOkResponse({ description: 'Paginated career goals' })
  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CareerGoalQueryDto,
  ) {
    return this.careerGoalsService.findAll(query, {
      activeOnly: user.role !== UserRole.ADMIN,
    });
  }

  @ApiOkResponse({ description: 'Career goal detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.careerGoalsService.findOne(id);
  }

  @ApiOkResponse({ description: 'Career goal updated' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCareerGoalDto,
  ) {
    return this.careerGoalsService.update(id, dto, user.id);
  }

  @ApiOkResponse({ description: 'Career goal deleted' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.careerGoalsService.remove(id, user.id);
  }

  @ApiCreatedResponse({ description: 'Career required skill created' })
  @Post(':careerGoalId/required-skills')
  createRequiredSkill(
    @Param('careerGoalId') careerGoalId: string,
    @Body() dto: CreateCareerRequiredSkillDto,
  ) {
    return this.careerGoalsService.createRequiredSkill(careerGoalId, dto);
  }

  @ApiOkResponse({ description: 'Paginated required skills for career goal' })
  @Get(':careerGoalId/required-skills')
  findRequiredSkills(
    @Param('careerGoalId') careerGoalId: string,
    @Query() query: CareerRequiredSkillQueryDto,
  ) {
    return this.careerGoalsService.findRequiredSkills(careerGoalId, query);
  }

  @ApiOkResponse({ description: 'Career required skill updated' })
  @Patch(':careerGoalId/required-skills/:requiredSkillId')
  updateRequiredSkill(
    @Param('careerGoalId') careerGoalId: string,
    @Param('requiredSkillId') requiredSkillId: string,
    @Body() dto: UpdateCareerRequiredSkillDto,
  ) {
    return this.careerGoalsService.updateRequiredSkill(
      careerGoalId,
      requiredSkillId,
      dto,
    );
  }

  @ApiOkResponse({ description: 'Career required skill deleted' })
  @Delete(':careerGoalId/required-skills/:requiredSkillId')
  removeRequiredSkill(
    @Param('careerGoalId') careerGoalId: string,
    @Param('requiredSkillId') requiredSkillId: string,
  ) {
    return this.careerGoalsService.removeRequiredSkill(careerGoalId, requiredSkillId);
  }
}
