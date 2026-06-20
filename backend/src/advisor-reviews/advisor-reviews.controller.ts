import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdvisorReviewsService } from './advisor-reviews.service';
import { AdvisorReviewQueryDto } from './dto/advisor-review-query.dto';
import { CreateAdvisorReviewDto } from './dto/create-advisor-review.dto';

@ApiTags('advisor-reviews')
@ApiBearerAuth()
@Controller('advisor-reviews')
export class AdvisorReviewsController {
  constructor(private readonly advisorReviewsService: AdvisorReviewsService) {}

  @Roles(UserRole.LECTURER)
  @ApiCreatedResponse({ description: 'Advisor review created for assigned student' })
  @Post('students/:studentId')
  createForStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() dto: CreateAdvisorReviewDto,
  ) {
    return this.advisorReviewsService.createForStudent(user, studentId, dto);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student advisor reviews' })
  @Get('me')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdvisorReviewQueryDto,
  ) {
    return this.advisorReviewsService.findMine(user.id, query);
  }

  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ description: 'All advisor reviews for admin' })
  @Get()
  findAll(@Query() query: AdvisorReviewQueryDto) {
    return this.advisorReviewsService.findAll(query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @ApiOkResponse({ description: 'Advisor reviews for a student' })
  @Get('students/:studentId')
  findForStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: AdvisorReviewQueryDto,
  ) {
    return this.advisorReviewsService.findForStudent(user, studentId, query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @ApiOkResponse({ description: 'Advisor review detail' })
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.advisorReviewsService.findOne(user, id);
  }
}
