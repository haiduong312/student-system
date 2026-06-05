import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student recommendations' })
  @Get('me')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationsService.findMine(user.id, query);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Recommendation status updated' })
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationStatusDto,
  ) {
    return this.recommendationsService.updateStatus(user.id, id, dto);
  }
}
