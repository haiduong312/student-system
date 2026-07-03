import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExportType, UserRole } from '@prisma/client';
import { AdvisorAssignmentsService } from '../advisor-assignments/advisor-assignments.service';
import { AdvisorAssignmentQueryDto } from '../advisor-assignments/dto/advisor-assignment-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CompetencyAnalysisService } from '../competency-analysis/competency-analysis.service';
import { CompetencyAnalysisExportQueryDto } from '../competency-analysis/dto/competency-analysis-export-query.dto';
import { ExportLogsService } from '../export-logs/export-logs.service';
import { StudentQueryDto } from '../students/dto/student-query.dto';
import { StudentsService } from '../students/students.service';
import { ExportFileStorageService } from './export-file-storage.service';
import { ExportPortfolioDto } from './dto/export-portfolio.dto';
import { ExportsService } from './exports.service';
import { CompetencyExcelGenerator } from './competency-excel.generator';
import { LecturerStudentsExcelGenerator } from './lecturer-students-excel.generator';
import { StudentPortfolioPdfGenerator } from './student-portfolio-pdf.generator';
import { StudentsExcelGenerator } from './students-excel.generator';

const admin: AuthenticatedUser = {
  id: 'admin-user-1',
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: UserRole.ADMIN,
};

describe('ExportsService student portfolio PDF workflow', () => {
  it('loads an authorized snapshot, generates, stores, then records the export', async () => {
    const events: string[] = [];
    const input = Object.assign(new ExportPortfolioDto(), {
      studentId: 'student-1',
      sections: ['profile', 'skills'],
    });
    let recordedInput: unknown;
    const service = new ExportsService(
      {
        findPortfolioForExport: async (
          user: AuthenticatedUser,
          studentId?: string,
        ) => {
          events.push('query');
          assert.equal(user, admin);
          assert.equal(studentId, 'student-1');
          return { studentCode: 'SV001' };
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('pdf');
        },
      } as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          return {
            fileUrl: '/api/exports/files/student-portfolio.pdf',
            filePath: '/tmp/student-portfolio.pdf',
            fileName: 'student-portfolio.pdf',
          };
        },
      } as ExportFileStorageService,
      {
        record: async (recordInput: unknown) => {
          events.push('log');
          recordedInput = recordInput;
          return null;
        },
      } as ExportLogsService,
    );

    const result = await service.exportStudentPortfolioPdf(admin, input);

    assert.deepEqual(events, ['query', 'generate', 'save', 'log']);
    assert.deepEqual(recordedInput, {
      userId: admin.id,
      exportType: ExportType.STUDENT_PORTFOLIO_PDF,
      fileUrl: '/api/exports/files/student-portfolio.pdf',
    });
    assert.equal(result.exportType, ExportType.STUDENT_PORTFOLIO_PDF);
    assert.ok(result.createdAt instanceof Date);
  });

  it('does not store or log when PDF generation fails', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {
        findPortfolioForExport: async () => {
          events.push('query');
          return { studentCode: 'SV001' };
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          throw new Error('generation failed');
        },
      } as unknown as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          throw new Error('must not be called');
        },
      } as unknown as ExportFileStorageService,
      {
        record: async () => {
          events.push('log');
          return null;
        },
      } as unknown as ExportLogsService,
    );

    await assert.rejects(
      service.exportStudentPortfolioPdf(admin, new ExportPortfolioDto()),
      /generation failed/,
    );
    assert.deepEqual(events, ['query', 'generate']);
  });

  it('does not log when storing the PDF fails', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {
        findPortfolioForExport: async () => {
          events.push('query');
          return { studentCode: 'SV001' };
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('pdf');
        },
      } as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          throw new Error('storage failed');
        },
      } as unknown as ExportFileStorageService,
      {
        record: async () => {
          events.push('log');
          return null;
        },
      } as unknown as ExportLogsService,
    );

    await assert.rejects(
      service.exportStudentPortfolioPdf(admin, new ExportPortfolioDto()),
      /storage failed/,
    );
    assert.deepEqual(events, ['query', 'generate', 'save']);
  });
});

describe('ExportsService students Excel workflow', () => {
  it('rejects non-admin users before querying export data', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {
        findAllForExport: async () => {
          events.push('query');
          return [];
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      { generate: async () => Buffer.from('xlsx') } as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {} as ExportFileStorageService,
      {} as ExportLogsService,
    );

    await assert.rejects(
      service.exportStudentsExcel(
        { ...admin, id: 'student-user-1', role: UserRole.STUDENT },
        new StudentQueryDto(),
      ),
      /do not have permission to export students/,
    );
    assert.deepEqual(events, []);
  });

  it('queries, generates, stores, then records the completed export', async () => {
    const events: string[] = [];
    const query = Object.assign(new StudentQueryDto(), { major: 'Software Engineering' });
    let recordedInput: unknown;

    const service = new ExportsService(
      {
        findAllForExport: async (user: AuthenticatedUser, receivedQuery: StudentQueryDto) => {
          events.push('query');
          assert.equal(user, admin);
          assert.equal(receivedQuery, query);
          return [];
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('xlsx');
        },
      } as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          return {
            fileUrl: '/api/exports/files/students.xlsx',
            filePath: '/tmp/students.xlsx',
            fileName: 'students.xlsx',
          };
        },
      } as ExportFileStorageService,
      {
        record: async (input: unknown) => {
          events.push('log');
          recordedInput = input;
          return null;
        },
      } as ExportLogsService,
    );

    const result = await service.exportStudentsExcel(admin, query);

    assert.deepEqual(events, ['query', 'generate', 'save', 'log']);
    assert.deepEqual(recordedInput, {
      userId: admin.id,
      exportType: ExportType.STUDENTS_EXCEL,
      fileUrl: '/api/exports/files/students.xlsx',
    });
    assert.equal(result.fileUrl, '/api/exports/files/students.xlsx');
    assert.equal(result.exportType, ExportType.STUDENTS_EXCEL);
    assert.ok(result.createdAt instanceof Date);
  });

  it('does not store or log when workbook generation fails', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {
        findAllForExport: async () => {
          events.push('query');
          return [];
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {
        generate: async () => {
          events.push('generate');
          throw new Error('generation failed');
        },
      } as unknown as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          throw new Error('must not be called');
        },
      } as unknown as ExportFileStorageService,
      {
        record: async () => {
          events.push('log');
          return null;
        },
      } as unknown as ExportLogsService,
    );

    await assert.rejects(
      service.exportStudentsExcel(admin, new StudentQueryDto()),
      /generation failed/,
    );
    assert.deepEqual(events, ['query', 'generate']);
  });

  it('does not log when storing the workbook fails', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {
        findAllForExport: async () => {
          events.push('query');
          return [];
        },
      } as unknown as StudentsService,
      {} as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('xlsx');
        },
      } as unknown as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          throw new Error('storage failed');
        },
      } as unknown as ExportFileStorageService,
      {
        record: async () => {
          events.push('log');
          return null;
        },
      } as unknown as ExportLogsService,
    );

    await assert.rejects(
      service.exportStudentsExcel(admin, new StudentQueryDto()),
      /storage failed/,
    );
    assert.deepEqual(events, ['query', 'generate', 'save']);
  });
});

describe('ExportsService lecturer students Excel workflow', () => {
  const lecturer: AuthenticatedUser = {
    id: 'lecturer-user-1',
    email: 'lecturer@example.com',
    fullName: 'Lecturer User',
    role: UserRole.LECTURER,
  };

  it('queries active scoped assignments, generates, stores, then logs', async () => {
    const events: string[] = [];
    const query = Object.assign(new AdvisorAssignmentQueryDto(), {
      search: 'SV001',
    });
    let savedInput: { ownerId?: string } | undefined;
    let recordedInput: unknown;

    const service = new ExportsService(
      {} as StudentsService,
      {
        findActiveStudentsForExport: async (
          user: AuthenticatedUser,
          receivedQuery: AdvisorAssignmentQueryDto,
        ) => {
          events.push('query');
          assert.equal(user, lecturer);
          assert.equal(receivedQuery, query);
          return [];
        },
      } as unknown as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('xlsx');
        },
      } as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async (input: { ownerId?: string }) => {
          events.push('save');
          savedInput = input;
          return {
            fileUrl: '/api/exports/files/lecturer-students.xlsx',
            filePath: '/tmp/lecturer-students.xlsx',
            fileName: 'lecturer-students.xlsx',
          };
        },
      } as unknown as ExportFileStorageService,
      {
        record: async (input: unknown) => {
          events.push('log');
          recordedInput = input;
          return null;
        },
      } as ExportLogsService,
    );

    const result = await service.exportLecturerStudentsExcel(lecturer, query);

    assert.deepEqual(events, ['query', 'generate', 'save', 'log']);
    assert.equal(savedInput?.ownerId, lecturer.id);
    assert.deepEqual(recordedInput, {
      userId: lecturer.id,
      exportType: ExportType.LECTURER_STUDENTS_EXCEL,
      fileUrl: '/api/exports/files/lecturer-students.xlsx',
    });
    assert.equal(result.fileUrl, '/api/exports/files/lecturer-students.xlsx');
    assert.equal(result.exportType, ExportType.LECTURER_STUDENTS_EXCEL);
    assert.ok(result.createdAt instanceof Date);
  });

  it('rejects students before querying assignments', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {} as StudentsService,
      {
        findActiveStudentsForExport: async () => {
          events.push('query');
          return [];
        },
      } as unknown as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {} as ExportFileStorageService,
      {} as ExportLogsService,
    );

    await assert.rejects(
      service.exportLecturerStudentsExcel(
        { ...lecturer, role: UserRole.STUDENT },
        new AdvisorAssignmentQueryDto(),
      ),
      /do not have permission to export lecturer students/,
    );
    assert.deepEqual(events, []);
  });

  it('does not log when lecturer workbook storage fails', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {} as StudentsService,
      {
        findActiveStudentsForExport: async () => {
          events.push('query');
          return [];
        },
      } as unknown as AdvisorAssignmentsService,
      {} as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('xlsx');
        },
      } as LecturerStudentsExcelGenerator,
      {} as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          throw new Error('storage failed');
        },
      } as unknown as ExportFileStorageService,
      {
        record: async () => {
          events.push('log');
          return null;
        },
      } as unknown as ExportLogsService,
    );

    await assert.rejects(
      service.exportLecturerStudentsExcel(
        lecturer,
        new AdvisorAssignmentQueryDto(),
      ),
      /storage failed/,
    );
    assert.deepEqual(events, ['query', 'generate', 'save']);
  });
});

describe('ExportsService competency Excel workflow', () => {
  it('queries scoped analyses, generates, stores, then records the export', async () => {
    const events: string[] = [];
    const query = Object.assign(new CompetencyAnalysisExportQueryDto(), {
      status: 'CURRENT',
    });
    let savedInput: { ownerId?: string } | undefined;
    let recordedInput: unknown;
    const service = new ExportsService(
      {} as StudentsService,
      {} as AdvisorAssignmentsService,
      {
        findForExport: async (
          user: AuthenticatedUser,
          receivedQuery: CompetencyAnalysisExportQueryDto,
        ) => {
          events.push('query');
          assert.equal(user, admin);
          assert.equal(receivedQuery, query);
          return [];
        },
      } as unknown as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('xlsx');
        },
      } as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async (input: { ownerId?: string }) => {
          events.push('save');
          savedInput = input;
          return {
            fileUrl: '/api/exports/files/competency.xlsx',
            filePath: '/tmp/competency.xlsx',
            fileName: 'competency.xlsx',
          };
        },
      } as unknown as ExportFileStorageService,
      {
        record: async (input: unknown) => {
          events.push('log');
          recordedInput = input;
          return null;
        },
      } as ExportLogsService,
    );

    const result = await service.exportCompetencyExcel(admin, query);

    assert.deepEqual(events, ['query', 'generate', 'save', 'log']);
    assert.equal(savedInput?.ownerId, admin.id);
    assert.deepEqual(recordedInput, {
      userId: admin.id,
      exportType: ExportType.COMPETENCY_EXCEL,
      fileUrl: '/api/exports/files/competency.xlsx',
    });
    assert.equal(result.exportType, ExportType.COMPETENCY_EXCEL);
    assert.ok(result.createdAt instanceof Date);
  });

  it('does not record a competency export when file storage fails', async () => {
    const events: string[] = [];
    const service = new ExportsService(
      {} as StudentsService,
      {} as AdvisorAssignmentsService,
      {
        findForExport: async () => {
          events.push('query');
          return [];
        },
      } as unknown as CompetencyAnalysisService,
      {} as StudentsExcelGenerator,
      {} as LecturerStudentsExcelGenerator,
      {
        generate: async () => {
          events.push('generate');
          return Buffer.from('xlsx');
        },
      } as CompetencyExcelGenerator,
      {} as StudentPortfolioPdfGenerator,
      {
        saveExportFile: async () => {
          events.push('save');
          throw new Error('storage failed');
        },
      } as unknown as ExportFileStorageService,
      {
        record: async () => {
          events.push('log');
          return null;
        },
      } as unknown as ExportLogsService,
    );

    await assert.rejects(
      service.exportCompetencyExcel(admin, new CompetencyAnalysisExportQueryDto()),
      /storage failed/,
    );
    assert.deepEqual(events, ['query', 'generate', 'save']);
  });
});
