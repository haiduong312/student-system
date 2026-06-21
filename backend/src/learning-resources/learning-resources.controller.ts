import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateLearningResourceDto } from './dto/create-learning-resource.dto';
import { LearningResourceQueryDto } from './dto/learning-resource-query.dto';
import { LinkResourceSkillDto } from './dto/link-resource-skill.dto';
import { UpdateLearningResourceDto } from './dto/update-learning-resource.dto';
import { UpdateResourceSkillDto } from './dto/update-resource-skill.dto';
import { LearningResourcesService } from './learning-resources.service';

@ApiTags('learning-resources')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('learning-resources')
export class LearningResourcesController {
  constructor(
    private readonly learningResourcesService: LearningResourcesService,
  ) {}

  @ApiCreatedResponse({ description: 'Learning resource created' })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearningResourceDto,
  ) {
    return this.learningResourcesService.create(dto, user.id);
  }

  @ApiOkResponse({ description: 'Paginated learning resources' })
  @Get()
  findAll(@Query() query: LearningResourceQueryDto) {
    return this.learningResourcesService.findAll(query);
  }

  @ApiOkResponse({ description: 'Learning resource detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.learningResourcesService.findOne(id);
  }

  @ApiOkResponse({ description: 'Learning resource updated' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLearningResourceDto,
  ) {
    return this.learningResourcesService.update(id, dto, user.id);
  }

  @ApiOkResponse({ description: 'Learning resource deactivated' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.learningResourcesService.remove(id, user.id);
  }

  @ApiCreatedResponse({ description: 'Skill linked to learning resource' })
  @Post(':id/skills')
  linkSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: LinkResourceSkillDto,
  ) {
    return this.learningResourcesService.linkSkill(id, dto, user.id);
  }

  @ApiOkResponse({ description: 'Learning resource skill link updated' })
  @Patch(':id/skills/:skillId')
  updateSkillLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateResourceSkillDto,
  ) {
    return this.learningResourcesService.updateSkillLink(
      id,
      skillId,
      dto,
      user.id,
    );
  }

  @ApiOkResponse({ description: 'Skill unlinked from learning resource' })
  @Delete(':id/skills/:skillId')
  unlinkSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('skillId') skillId: string,
  ) {
    return this.learningResourcesService.unlinkSkill(id, skillId, user.id);
  }
}
