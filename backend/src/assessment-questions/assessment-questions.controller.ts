import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AssessmentQuestionsService } from './assessment-questions.service';
import { AssessmentQuestionQueryDto } from './dto/assessment-question-query.dto';
import { CreateAssessmentQuestionDto } from './dto/create-assessment-question.dto';
import { UpdateAssessmentQuestionDto } from './dto/update-assessment-question.dto';

@ApiTags('assessment-questions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('assessment-questions')
export class AssessmentQuestionsController {
  constructor(
    private readonly assessmentQuestionsService: AssessmentQuestionsService,
  ) {}

  @ApiCreatedResponse({ description: 'Assessment question created' })
  @Post()
  create(@Body() dto: CreateAssessmentQuestionDto) {
    return this.assessmentQuestionsService.create(dto);
  }

  @ApiOkResponse({ description: 'Paginated assessment questions' })
  @Get()
  findAll(@Query() query: AssessmentQuestionQueryDto) {
    return this.assessmentQuestionsService.findAll(query);
  }

  @ApiOkResponse({ description: 'Assessment question detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentQuestionsService.findOne(id);
  }

  @ApiOkResponse({ description: 'Assessment question updated' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssessmentQuestionDto) {
    return this.assessmentQuestionsService.update(id, dto);
  }

  @ApiOkResponse({ description: 'Assessment question deactivated' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessmentQuestionsService.remove(id);
  }
}
