import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalysisHistoryQueryDto } from './dto/analysis-query.dto';
import { CompetencyAnalysisService } from './competency-analysis.service';

@ApiTags('competency-analysis')
@ApiBearerAuth()
@Controller('competency')
export class CompetencyAnalysisController {
  constructor(private readonly competencyAnalysisService: CompetencyAnalysisService) {}

  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Analyze current student competency profile' })
  @Post('analyze/me')
  analyzeMine(@CurrentUser() user: AuthenticatedUser) {
    return this.competencyAnalysisService.analyzeForCurrentStudent(user.id);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student analysis history' })
  @Get('analysis-history/me')
  getMyHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalysisHistoryQueryDto,
  ) {
    return this.competencyAnalysisService.getHistoryForCurrentStudent(user.id, query);
  }

  @Roles(UserRole.STUDENT, UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Analysis result detail' })
  @Get('analysis-results/:id')
  getResult(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.competencyAnalysisService.getResult(user, id);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Analyze specific student competency profile' })
  @Post('students/:studentId/analyze')
  analyzeStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    return this.competencyAnalysisService.analyzeForStudent(user, studentId);
  }
}
