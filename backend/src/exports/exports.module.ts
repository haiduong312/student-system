import { Module } from '@nestjs/common';
import { AdvisorAssignmentsModule } from '../advisor-assignments/advisor-assignments.module';
import { CompetencyAnalysisModule } from '../competency-analysis/competency-analysis.module';
import { StudentsModule } from '../students/students.module';
import { CompetencyExcelGenerator } from './competency-excel.generator';
import { ExportHistoryService } from './export-history.service';
import { ExportFileStorageService } from './export-file-storage.service';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { LecturerStudentsExcelGenerator } from './lecturer-students-excel.generator';
import { StudentPortfolioPdfGenerator } from './student-portfolio-pdf.generator';
import { StudentsExcelGenerator } from './students-excel.generator';

@Module({
  imports: [AdvisorAssignmentsModule, CompetencyAnalysisModule, StudentsModule],
  controllers: [ExportsController],
  providers: [
    ExportsService,
    ExportFileStorageService,
    StudentsExcelGenerator,
    LecturerStudentsExcelGenerator,
    CompetencyExcelGenerator,
    StudentPortfolioPdfGenerator,
    ExportHistoryService,
  ],
  exports: [ExportsService, ExportFileStorageService],
})
export class ExportsModule {}
