import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateRecommendationTemplateDto } from './dto/create-recommendation-template.dto';
import { RecommendationTemplateQueryDto } from './dto/recommendation-template-query.dto';
import { UpdateRecommendationTemplateDto } from './dto/update-recommendation-template.dto';
import { RecommendationTemplatesService } from './recommendation-templates.service';

@ApiTags('recommendation-templates')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('recommendation-templates')
export class RecommendationTemplatesController {
  constructor(
    private readonly recommendationTemplatesService: RecommendationTemplatesService,
  ) {}

  @ApiCreatedResponse({ description: 'Recommendation template created' })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecommendationTemplateDto,
  ) {
    return this.recommendationTemplatesService.create(dto, user.id);
  }

  @ApiOkResponse({ description: 'Paginated recommendation templates' })
  @Get()
  findAll(@Query() query: RecommendationTemplateQueryDto) {
    return this.recommendationTemplatesService.findAll(query);
  }

  @ApiOkResponse({ description: 'Recommendation template detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recommendationTemplatesService.findOne(id);
  }

  @ApiOkResponse({ description: 'Recommendation template updated' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationTemplateDto,
  ) {
    return this.recommendationTemplatesService.update(id, dto, user.id);
  }

  @ApiOkResponse({ description: 'Recommendation template deactivated' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recommendationTemplatesService.remove(id, user.id);
  }
}
