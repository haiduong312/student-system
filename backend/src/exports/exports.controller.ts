import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { AdvisorAssignmentQueryDto } from '../advisor-assignments/dto/advisor-assignment-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CompetencyAnalysisExportQueryDto } from '../competency-analysis/dto/competency-analysis-export-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { StudentQueryDto } from '../students/dto/student-query.dto';
import { ExportFileResponseDto } from './dto/export-file-response.dto';
import { ExportHistoryQueryDto } from './dto/export-history-query.dto';
import { ExportHistoryResponseDto } from './dto/export-history-response.dto';
import { ExportPortfolioDto } from './dto/export-portfolio.dto';
import { ExportFileStorageService } from './export-file-storage.service';
import { ExportHistoryService } from './export-history.service';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exportsService: ExportsService,
    private readonly exportFileStorage: ExportFileStorageService,
    private readonly exportHistoryService: ExportHistoryService,
  ) {}

  @Roles(UserRole.STUDENT, UserRole.LECTURER, UserRole.ADMIN)
  @ApiBody({ type: ExportPortfolioDto, required: false })
  @ApiCreatedResponse({
    description: 'Student portfolio PDF generated and stored successfully',
    type: ExportFileResponseDto,
  })
  @Post('portfolio')
  exportStudentPortfolio(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ExportPortfolioDto,
  ) {
    return this.exportsService.exportStudentPortfolioPdf(user, input);
  }

  @Roles(UserRole.ADMIN)
  @ApiBody({ type: StudentQueryDto, required: false })
  @ApiCreatedResponse({
    description: 'Students Excel report generated and stored successfully',
    type: ExportFileResponseDto,
  })
  @Post('reports/students')
  exportStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: StudentQueryDto,
  ) {
    return this.exportsService.exportStudentsExcel(user, input);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @ApiOkResponse({
    description: 'Paginated export history scoped to the current user or all for admin',
    type: ExportHistoryResponseDto,
  })
  @Get('history')
  exportHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportHistoryQueryDto,
  ) {
    return this.exportHistoryService.findHistory(user, query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @ApiOkResponse({ description: 'Private generated export file stream' })
  @Get('files/:fileName')
  async downloadExportFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ) {
    const file = await this.exportFileStorage.getExportFile(fileName, user.id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    createReadStream(file.filePath).pipe(response);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @ApiBody({ type: CompetencyAnalysisExportQueryDto, required: false })
  @ApiCreatedResponse({
    description: 'Competency analysis Excel report generated and stored successfully',
    type: ExportFileResponseDto,
  })
  @Post('reports/competency')
  exportCompetency(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CompetencyAnalysisExportQueryDto,
  ) {
    return this.exportsService.exportCompetencyExcel(user, input);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER)
  @ApiBody({ type: AdvisorAssignmentQueryDto, required: false })
  @ApiCreatedResponse({
    description: 'Assigned students Excel report generated and stored successfully',
    type: ExportFileResponseDto,
  })
  @Post('reports/lecturer-students')
  exportLecturerStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AdvisorAssignmentQueryDto,
  ) {
    return this.exportsService.exportLecturerStudentsExcel(user, input);
  }
}
