import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ExportType, UserRole } from '@prisma/client';
import { AdvisorAssignmentsService } from '../advisor-assignments/advisor-assignments.service';
import { AdvisorAssignmentQueryDto } from '../advisor-assignments/dto/advisor-assignment-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CompetencyAnalysisService } from '../competency-analysis/competency-analysis.service';
import { CompetencyAnalysisExportQueryDto } from '../competency-analysis/dto/competency-analysis-export-query.dto';
import { ExportLogsService } from '../export-logs/export-logs.service';
import { StudentQueryDto } from '../students/dto/student-query.dto';
import { StudentsService } from '../students/students.service';
import { ExportPortfolioDto } from './dto/export-portfolio.dto';
import { CompetencyExcelGenerator } from './competency-excel.generator';
import { ExportFileStorageService } from './export-file-storage.service';
import { LecturerStudentsExcelGenerator } from './lecturer-students-excel.generator';
import { StudentPortfolioPdfGenerator } from './student-portfolio-pdf.generator';
import { StudentsExcelGenerator } from './students-excel.generator';

@Injectable()
export class ExportsService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly advisorAssignmentsService: AdvisorAssignmentsService,
    private readonly competencyAnalysisService: CompetencyAnalysisService,
    private readonly studentsExcelGenerator: StudentsExcelGenerator,
    private readonly lecturerStudentsExcelGenerator: LecturerStudentsExcelGenerator,
    private readonly competencyExcelGenerator: CompetencyExcelGenerator,
    private readonly studentPortfolioPdfGenerator: StudentPortfolioPdfGenerator,
    private readonly exportFileStorage: ExportFileStorageService,
    private readonly exportLogs: ExportLogsService,
  ) {}

  async exportStudentPortfolioPdf(
    user: AuthenticatedUser,
    input: ExportPortfolioDto = new ExportPortfolioDto(),
  ) {
    const snapshot = await this.studentsService.findPortfolioForExport(
      user,
      input.studentId,
    );
    const buffer = await this.studentPortfolioPdfGenerator.generate(snapshot, input);
    const savedFile = await this.exportFileStorage.saveExportFile({
      buffer,
      fileName: `student-portfolio-${snapshot.studentCode}.pdf`,
      mimeType: 'application/pdf',
      ownerId: user.id,
    });
    const createdAt = new Date();

    await this.exportLogs.record({
      userId: user.id,
      exportType: ExportType.STUDENT_PORTFOLIO_PDF,
      fileUrl: savedFile.fileUrl,
    });

    return {
      fileUrl: savedFile.fileUrl,
      exportType: ExportType.STUDENT_PORTFOLIO_PDF,
      createdAt,
    };
  }

  async exportStudentsExcel(user: AuthenticatedUser, input: StudentQueryDto) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to export students');
    }

    const students = await this.studentsService.findAllForExport(user, input);
    const buffer = await this.studentsExcelGenerator.generate(students);
    const savedFile = await this.exportFileStorage.saveExportFile({
      buffer,
      fileName: 'students-report.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ownerId: user.id,
    });
    const createdAt = new Date();

    await this.exportLogs.record({
      userId: user.id,
      exportType: ExportType.STUDENTS_EXCEL,
      fileUrl: savedFile.fileUrl,
    });

    return {
      fileUrl: savedFile.fileUrl,
      exportType: ExportType.STUDENTS_EXCEL,
      createdAt,
    };
  }

  async exportCompetencyExcel(
    user: AuthenticatedUser,
    input: CompetencyAnalysisExportQueryDto = new CompetencyAnalysisExportQueryDto(),
  ) {
    const results = await this.competencyAnalysisService.findForExport(user, input);
    const buffer = await this.competencyExcelGenerator.generate(results);
    const savedFile = await this.exportFileStorage.saveExportFile({
      buffer,
      fileName: 'competency-report.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ownerId: user.id,
    });
    const createdAt = new Date();

    await this.exportLogs.record({
      userId: user.id,
      exportType: ExportType.COMPETENCY_EXCEL,
      fileUrl: savedFile.fileUrl,
    });

    return {
      fileUrl: savedFile.fileUrl,
      exportType: ExportType.COMPETENCY_EXCEL,
      createdAt,
    };
  }

  async exportLecturerStudentsExcel(
    user: AuthenticatedUser,
    input: AdvisorAssignmentQueryDto,
  ) {
    if (user.role !== UserRole.LECTURER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to export lecturer students',
      );
    }

    const assignments = await this.advisorAssignmentsService.findActiveStudentsForExport(
      user,
      input,
    );
    const buffer = await this.lecturerStudentsExcelGenerator.generate(assignments);
    const savedFile = await this.exportFileStorage.saveExportFile({
      buffer,
      fileName: 'lecturer-students-report.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ownerId: user.id,
    });
    const createdAt = new Date();

    await this.exportLogs.record({
      userId: user.id,
      exportType: ExportType.LECTURER_STUDENTS_EXCEL,
      fileUrl: savedFile.fileUrl,
    });

    return {
      fileUrl: savedFile.fileUrl,
      exportType: ExportType.LECTURER_STUDENTS_EXCEL,
      createdAt,
    };
  }
}
