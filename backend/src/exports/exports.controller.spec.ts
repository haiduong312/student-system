import { ForbiddenException } from '@nestjs/common';
import { ExportType, UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdvisorAssignmentsService } from '../advisor-assignments/advisor-assignments.service';
import { AdvisorAssignmentQueryDto } from '../advisor-assignments/dto/advisor-assignment-query.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CompetencyAnalysisService } from '../competency-analysis/competency-analysis.service';
import { CompetencyAnalysisExportQueryDto } from '../competency-analysis/dto/competency-analysis-export-query.dto';
import { ExportLogsService } from '../export-logs/export-logs.service';
import { StudentQueryDto } from '../students/dto/student-query.dto';
import { StudentsService } from '../students/students.service';
import { CompetencyExcelGenerator } from './competency-excel.generator';
import { ExportPortfolioDto } from './dto/export-portfolio.dto';
import { ExportFileStorageService } from './export-file-storage.service';
import { ExportHistoryService } from './export-history.service';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { LecturerStudentsExcelGenerator } from './lecturer-students-excel.generator';
import { StudentPortfolioPdfGenerator } from './student-portfolio-pdf.generator';
import { StudentsExcelGenerator } from './students-excel.generator';

type EndpointKey =
  | 'portfolio'
  | 'students'
  | 'competency'
  | 'lecturerStudents';
type FailureStage = 'generate' | 'store';

interface EndpointScenario {
  key: EndpointKey;
  route: string;
  exportType: ExportType;
  fileUrl: string;
  user: AuthenticatedUser;
  input:
    | ExportPortfolioDto
    | StudentQueryDto
    | CompetencyAnalysisExportQueryDto
    | AdvisorAssignmentQueryDto;
  unauthorizedUser: AuthenticatedUser;
  unauthorizedInput:
    | ExportPortfolioDto
    | StudentQueryDto
    | CompetencyAnalysisExportQueryDto
    | AdvisorAssignmentQueryDto;
  failureStage: FailureStage;
}

interface HarnessOptions {
  recordReturnsNull?: boolean;
  failureStage?: FailureStage;
  permissionFails?: boolean;
}

const studentUser: AuthenticatedUser = {
  id: 'student-user-1',
  email: 'student@example.com',
  fullName: 'Student One',
  role: UserRole.STUDENT,
};

const lecturerUser: AuthenticatedUser = {
  id: 'lecturer-user-1',
  email: 'lecturer@example.com',
  fullName: 'Lecturer One',
  role: UserRole.LECTURER,
};

const adminUser: AuthenticatedUser = {
  id: 'admin-user-1',
  email: 'admin@example.com',
  fullName: 'Admin One',
  role: UserRole.ADMIN,
};

const endpointScenarios: EndpointScenario[] = [
  {
    key: 'portfolio',
    route: 'POST /exports/portfolio',
    exportType: ExportType.STUDENT_PORTFOLIO_PDF,
    fileUrl: '/api/exports/files/student-portfolio.pdf',
    user: studentUser,
    input: new ExportPortfolioDto(),
    unauthorizedUser: studentUser,
    unauthorizedInput: Object.assign(new ExportPortfolioDto(), {
      studentId: 'student-2',
    }),
    failureStage: 'generate',
  },
  {
    key: 'students',
    route: 'POST /exports/reports/students',
    exportType: ExportType.STUDENTS_EXCEL,
    fileUrl: '/api/exports/files/students.xlsx',
    user: adminUser,
    input: new StudentQueryDto(),
    unauthorizedUser: studentUser,
    unauthorizedInput: new StudentQueryDto(),
    failureStage: 'store',
  },
  {
    key: 'competency',
    route: 'POST /exports/reports/competency',
    exportType: ExportType.COMPETENCY_EXCEL,
    fileUrl: '/api/exports/files/competency.xlsx',
    user: studentUser,
    input: new CompetencyAnalysisExportQueryDto(),
    unauthorizedUser: studentUser,
    unauthorizedInput: Object.assign(new CompetencyAnalysisExportQueryDto(), {
      studentId: 'student-2',
    }),
    failureStage: 'generate',
  },
  {
    key: 'lecturerStudents',
    route: 'POST /exports/reports/lecturer-students',
    exportType: ExportType.LECTURER_STUDENTS_EXCEL,
    fileUrl: '/api/exports/files/lecturer-students.xlsx',
    user: lecturerUser,
    input: new AdvisorAssignmentQueryDto(),
    unauthorizedUser: studentUser,
    unauthorizedInput: new AdvisorAssignmentQueryDto(),
    failureStage: 'store',
  },
];

function createHarness(scenario: EndpointScenario, options: HarnessOptions = {}) {
  const events: string[] = [];
  const recordCalls: unknown[] = [];
  const permissionError = new ForbiddenException('export permission denied');
  const generate = async () => {
    events.push('generate');
    if (options.failureStage === 'generate') {
      throw new Error('export generation failed');
    }
    return Buffer.from(scenario.exportType.endsWith('PDF') ? 'pdf' : 'xlsx');
  };
  const storage = {
    saveExportFile: async () => {
      events.push('save');
      if (options.failureStage === 'store') {
        throw new Error('export storage failed');
      }
      return {
        fileUrl: scenario.fileUrl,
        filePath: `/tmp/${scenario.fileUrl.split('/').at(-1)}`,
        fileName: scenario.fileUrl.split('/').at(-1)!,
      };
    },
  } as unknown as ExportFileStorageService;
  const exportLogs = {
    record: async (input: unknown) => {
      events.push('record');
      recordCalls.push(input);
      return options.recordReturnsNull ? null : { id: 'export-log-1' };
    },
  } as ExportLogsService;
  const studentsService = {
    findPortfolioForExport: async () => {
      events.push('query');
      if (options.permissionFails) {
        throw permissionError;
      }
      return { studentCode: 'SV001' };
    },
    findAllForExport: async () => {
      events.push('query');
      return [];
    },
  } as unknown as StudentsService;
  const advisorAssignmentsService = {
    findActiveStudentsForExport: async () => {
      events.push('query');
      return [];
    },
  } as unknown as AdvisorAssignmentsService;
  const competencyAnalysisService = {
    findForExport: async () => {
      events.push('query');
      if (options.permissionFails) {
        throw permissionError;
      }
      return [];
    },
  } as unknown as CompetencyAnalysisService;
  const exportsService = new ExportsService(
    studentsService,
    advisorAssignmentsService,
    competencyAnalysisService,
    { generate } as StudentsExcelGenerator,
    { generate } as LecturerStudentsExcelGenerator,
    { generate } as CompetencyExcelGenerator,
    { generate } as StudentPortfolioPdfGenerator,
    storage,
    exportLogs,
  );
  const controller = new ExportsController(
    exportsService,
    storage,
    {} as ExportHistoryService,
  );

  return { controller, events, recordCalls };
}

function invokeEndpoint(
  scenario: EndpointScenario,
  controller: ExportsController,
  user = scenario.user,
  input = scenario.input,
) {
  switch (scenario.key) {
    case 'portfolio':
      return controller.exportStudentPortfolio(user, input as ExportPortfolioDto);
    case 'students':
      return controller.exportStudents(user, input as StudentQueryDto);
    case 'competency':
      return controller.exportCompetency(
        user,
        input as CompetencyAnalysisExportQueryDto,
      );
    case 'lecturerStudents':
      return controller.exportLecturerStudents(
        user,
        input as AdvisorAssignmentQueryDto,
      );
  }
}

describe('implemented export endpoint logging workflow', () => {
  for (const scenario of endpointScenarios) {
    it(`${scenario.route} records the saved file after a successful export`, async () => {
      const harness = createHarness(scenario);

      const result = await invokeEndpoint(scenario, harness.controller);

      assert.equal(result.fileUrl, scenario.fileUrl);
      assert.deepEqual(harness.recordCalls, [
        {
          userId: scenario.user.id,
          exportType: scenario.exportType,
          fileUrl: scenario.fileUrl,
        },
      ]);
      assert.equal(harness.events.at(-2), 'save');
      assert.equal(harness.events.at(-1), 'record');
    });

    it(`${scenario.route} still returns fileUrl when best-effort logging returns null`, async () => {
      const harness = createHarness(scenario, { recordReturnsNull: true });

      const result = await invokeEndpoint(scenario, harness.controller);

      assert.equal(result.fileUrl, scenario.fileUrl);
      assert.equal(harness.recordCalls.length, 1);
      assert.deepEqual(harness.recordCalls[0], {
        userId: scenario.user.id,
        exportType: scenario.exportType,
        fileUrl: scenario.fileUrl,
      });
    });

    it(`${scenario.route} does not record when export ${scenario.failureStage} fails`, async () => {
      const harness = createHarness(scenario, {
        failureStage: scenario.failureStage,
      });

      await assert.rejects(
        invokeEndpoint(scenario, harness.controller),
        scenario.failureStage === 'generate'
          ? /export generation failed/
          : /export storage failed/,
      );
      assert.deepEqual(harness.recordCalls, []);
      assert.equal(harness.events.includes('record'), false);
    });

    it(`${scenario.route} does not record when permission is denied`, async () => {
      const harness = createHarness(scenario, { permissionFails: true });

      await assert.rejects(
        invokeEndpoint(
          scenario,
          harness.controller,
          scenario.unauthorizedUser,
          scenario.unauthorizedInput,
        ),
        ForbiddenException,
      );
      assert.deepEqual(harness.recordCalls, []);
      assert.equal(harness.events.includes('record'), false);
    });
  }
});
