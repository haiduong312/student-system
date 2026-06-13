import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CareerRequiredSkillQueryDto } from './dto/career-required-skill-query.dto';
import { CreateCareerRequiredSkillDto } from './dto/create-career-required-skill.dto';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { SpecializationQueryDto } from './dto/specialization-query.dto';
import { UpdateCareerRequiredSkillDto } from './dto/update-career-required-skill.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { SpecializationsService } from './specializations.service';

@ApiTags('specializations')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller()
export class AdminSpecializationsController {
  constructor(private readonly specializationsService: SpecializationsService) {}

  @ApiOkResponse({ description: 'Paginated specializations' })
  @Get('admin/specializations')
  findAll(@Query() query: SpecializationQueryDto) {
    return this.specializationsService.findAll(query);
  }

  @ApiOkResponse({ description: 'Specialization detail' })
  @Get('admin/specializations/:id')
  findOne(@Param('id') id: string) {
    return this.specializationsService.findOne(id);
  }

  @ApiOkResponse({ description: 'Paginated specializations for career goal' })
  @Get('admin/career-goals/:careerGoalId/specializations')
  findByCareerGoal(
    @Param('careerGoalId') careerGoalId: string,
    @Query() query: SpecializationQueryDto,
  ) {
    return this.specializationsService.findByCareerGoal(careerGoalId, query);
  }

  @ApiCreatedResponse({ description: 'Specialization created' })
  @Post('admin/specializations')
  create(@Body() dto: CreateSpecializationDto) {
    return this.specializationsService.create(dto);
  }

  @ApiOkResponse({ description: 'Specialization updated' })
  @Patch('admin/specializations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSpecializationDto) {
    return this.specializationsService.update(id, dto);
  }

  @ApiOkResponse({ description: 'Specialization deactivated' })
  @Delete('admin/specializations/:id')
  deactivate(@Param('id') id: string) {
    return this.specializationsService.deactivate(id);
  }

  @ApiOkResponse({ description: 'Paginated required skills for specialization' })
  @Get('admin/specializations/:specializationId/required-skills')
  findRequiredSkills(
    @Param('specializationId') specializationId: string,
    @Query() query: CareerRequiredSkillQueryDto,
  ) {
    return this.specializationsService.findRequiredSkills(specializationId, query);
  }

  @ApiCreatedResponse({ description: 'Specialization required skill created' })
  @Post('admin/specializations/:specializationId/required-skills')
  createRequiredSkill(
    @Param('specializationId') specializationId: string,
    @Body() dto: CreateCareerRequiredSkillDto,
  ) {
    return this.specializationsService.createRequiredSkill(specializationId, dto);
  }

  @ApiOkResponse({ description: 'Specialization required skill updated' })
  @Patch('admin/specializations/:specializationId/required-skills/:id')
  updateRequiredSkill(
    @Param('specializationId') specializationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCareerRequiredSkillDto,
  ) {
    return this.specializationsService.updateRequiredSkill(specializationId, id, dto);
  }

  @ApiOkResponse({ description: 'Specialization required skill deleted' })
  @Delete('admin/specializations/:specializationId/required-skills/:id')
  removeRequiredSkill(
    @Param('specializationId') specializationId: string,
    @Param('id') id: string,
  ) {
    return this.specializationsService.removeRequiredSkill(specializationId, id);
  }
}

@ApiTags('specializations')
@Controller('career-goals/:careerGoalId/specializations')
export class PublicCareerGoalSpecializationsController {
  constructor(private readonly specializationsService: SpecializationsService) {}

  @Public()
  @ApiOkResponse({ description: 'Active specializations for career goal' })
  @Get()
  findActiveByCareerGoal(
    @Param('careerGoalId') careerGoalId: string,
    @Query() query: SpecializationQueryDto,
  ) {
    return this.specializationsService.findByCareerGoal(careerGoalId, query, {
      activeOnly: true,
    });
  }
}
