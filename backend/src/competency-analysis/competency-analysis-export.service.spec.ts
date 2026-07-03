import { ForbiddenException } from '@nestjs/common';
import {
  AnalysisResultStatus,
  AssignmentStatus,
  UserRole,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CompetencyAnalysisService } from './competency-analysis.service';
import { CompetencyAnalysisExportQueryDto } from './dto/competency-analysis-export-query.dto';

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

function createService(prisma: object, accessPolicy: object = {}) {
  return new CompetencyAnalysisService(
    prisma as never,
    accessPolicy as never,
    {} as never,
    {} as never,
  );
}

describe('CompetencyAnalysisService export scope', () => {
  it('limits students to their own analyses and applies schema-backed filters', async () => {
    let receivedQuery: any;
    const service = createService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      competencyAnalysisResult: {
        findMany: async (query: any) => {
          receivedQuery = query;
          return [];
        },
      },
    });
    const query = Object.assign(new CompetencyAnalysisExportQueryDto(), {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'specialization-1',
      status: AnalysisResultStatus.CURRENT,
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });

    await service.findForExport(studentUser, query);

    assert.deepEqual(receivedQuery.where, {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'specialization-1',
      status: AnalysisResultStatus.CURRENT,
      analyzedAt: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
        lte: new Date('2026-01-31T23:59:59.999Z'),
      },
    });
  });

  it('rejects a student requesting another student analysis', async () => {
    let queriedResults = false;
    const service = createService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      competencyAnalysisResult: {
        findMany: async () => {
          queriedResults = true;
          return [];
        },
      },
    });
    const query = Object.assign(new CompetencyAnalysisExportQueryDto(), {
      studentId: 'student-2',
    });

    await assert.rejects(
      service.findForExport(studentUser, query),
      /Students can only export their own competency analyses/,
    );
    assert.equal(queriedResults, false);
  });

  it('limits an unfiltered lecturer export to active assignments', async () => {
    let receivedQuery: any;
    const service = createService({
      lecturer: {
        findUnique: async () => ({ id: 'lecturer-1' }),
      },
      competencyAnalysisResult: {
        findMany: async (query: any) => {
          receivedQuery = query;
          return [];
        },
      },
    });

    await service.findForExport(
      lecturerUser,
      new CompetencyAnalysisExportQueryDto(),
    );

    assert.deepEqual(receivedQuery.where, {
      student: {
        advisorAssignments: {
          some: {
            lecturerId: 'lecturer-1',
            status: AssignmentStatus.ACTIVE,
          },
        },
      },
    });
  });

  it('uses the existing access policy for a lecturer-selected student', async () => {
    let checkedStudentId: string | undefined;
    let queriedResults = false;
    const service = createService(
      {
        lecturer: {
          findUnique: async () => ({ id: 'lecturer-1' }),
        },
        competencyAnalysisResult: {
          findMany: async () => {
            queriedResults = true;
            return [];
          },
        },
      },
      {
        assertCanAccessStudent: async (
          _user: AuthenticatedUser,
          studentId: string,
        ) => {
          checkedStudentId = studentId;
          throw new ForbiddenException('not assigned');
        },
      },
    );
    const query = Object.assign(new CompetencyAnalysisExportQueryDto(), {
      studentId: 'student-2',
    });

    await assert.rejects(service.findForExport(lecturerUser, query), /not assigned/);
    assert.equal(checkedStudentId, 'student-2');
    assert.equal(queriedResults, false);
  });

  it('allows an admin to export across students', async () => {
    let receivedQuery: any;
    const service = createService({
      competencyAnalysisResult: {
        findMany: async (query: any) => {
          receivedQuery = query;
          return [];
        },
      },
    });

    await service.findForExport(
      { ...studentUser, id: 'admin-1', role: UserRole.ADMIN },
      new CompetencyAnalysisExportQueryDto(),
    );

    assert.deepEqual(receivedQuery.where, {});
  });
});
