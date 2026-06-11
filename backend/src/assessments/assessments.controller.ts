import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AssessmentsService } from './assessments.service';
import { StartAssessmentDto } from './dto/start-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Assessment started for current student' })
  @Post('start')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartAssessmentDto,
  ) {
    return this.assessmentsService.startAssessment(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Assessment submitted and graded' })
  @Post(':id/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitAssessmentDto,
    @Param('id') id: string,
  ) {
    return this.assessmentsService.submitAssessment(user.id, id, dto);
  }
}
