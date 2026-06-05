import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSkillCategoryDto } from './dto/create-skill-category.dto';
import { SkillCategoryQueryDto } from './dto/skill-category-query.dto';
import { UpdateSkillCategoryDto } from './dto/update-skill-category.dto';
import { SkillCategoriesService } from './skill-categories.service';

@ApiTags('skill-categories')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('skill-categories')
export class SkillCategoriesController {
  constructor(private readonly skillCategoriesService: SkillCategoriesService) {}

  @ApiCreatedResponse({ description: 'Skill category created' })
  @Post()
  create(@Body() dto: CreateSkillCategoryDto) {
    return this.skillCategoriesService.create(dto);
  }

  @ApiOkResponse({ description: 'Paginated skill categories' })
  @Get()
  findAll(@Query() query: SkillCategoryQueryDto) {
    return this.skillCategoriesService.findAll(query);
  }

  @ApiOkResponse({ description: 'Skill category detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillCategoriesService.findOne(id);
  }

  @ApiOkResponse({ description: 'Skill category updated' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSkillCategoryDto) {
    return this.skillCategoriesService.update(id, dto);
  }

  @ApiOkResponse({ description: 'Skill category deleted' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skillCategoriesService.remove(id);
  }
}
