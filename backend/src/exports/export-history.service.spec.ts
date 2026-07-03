import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExportType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ExportHistoryQueryDto } from './dto/export-history-query.dto';
import { ExportHistoryService } from './export-history.service';

const student: AuthenticatedUser = {
  id: 'student-user-1',
  email: 'student@example.com',
  fullName: 'Student One',
  role: UserRole.STUDENT,
};

describe('ExportHistoryService', () => {
  it('returns only the current user logs and supports filters plus pagination aliases', async () => {
    let findManyInput: any;
    let countInput: any;
    const createdAt = new Date('2026-06-15T02:30:00.000Z');
    const service = new ExportHistoryService({
      exportLog: {
        findMany: async (input: any) => {
          findManyInput = input;
          return [
            {
              id: 'log-1',
              userId: student.id,
              exportType: ExportType.STUDENT_PORTFOLIO_PDF,
              fileUrl: '/api/exports/files/portfolio.pdf',
              createdAt,
            },
          ];
        },
        count: async (input: any) => {
          countInput = input;
          return 7;
        },
        create: async () => {
          throw new Error('history must not create an export log');
        },
      },
    } as unknown as PrismaService);
    const query = Object.assign(new ExportHistoryQueryDto(), {
      exportType: ExportType.STUDENT_PORTFOLIO_PDF,
      current: 2,
      pageSize: 5,
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    const result = await service.findHistory(student, query);

    assert.deepEqual(findManyInput.where, {
      userId: student.id,
      exportType: ExportType.STUDENT_PORTFOLIO_PDF,
      createdAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-30T23:59:59.999Z'),
      },
    });
    assert.equal(findManyInput.skip, 5);
    assert.equal(findManyInput.take, 5);
    assert.deepEqual(findManyInput.orderBy, { createdAt: 'desc' });
    assert.deepEqual(countInput, { where: findManyInput.where });
    assert.equal('userId' in result.data[0], false);
    assert.deepEqual(result.meta, {
      page: 2,
      limit: 5,
      total: 7,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('allows admin to view all logs and includes userId', async () => {
    let findManyInput: any;
    const service = new ExportHistoryService({
      exportLog: {
        findMany: async (input: any) => {
          findManyInput = input;
          return [
            {
              id: 'log-1',
              userId: 'student-user-1',
              exportType: ExportType.COMPETENCY_EXCEL,
              fileUrl: '/api/exports/files/competency.xlsx',
              createdAt: new Date('2026-06-15T02:30:00.000Z'),
            },
          ];
        },
        count: async () => 1,
      },
    } as unknown as PrismaService);

    const result = await service.findHistory(
      { ...student, id: 'admin-user-1', role: UserRole.ADMIN },
      Object.assign(new ExportHistoryQueryDto(), { page: 1, limit: 10 }),
    );

    assert.deepEqual(findManyInput.where, {});
    assert.equal(result.data[0].userId, 'student-user-1');
    assert.equal(result.meta.limit, 10);
  });

  it('defaults every non-admin role to its own logs', async () => {
    let receivedWhere: unknown;
    const lecturer = {
      ...student,
      id: 'lecturer-user-1',
      role: UserRole.LECTURER,
    };
    const service = new ExportHistoryService({
      exportLog: {
        findMany: async ({ where }: any) => {
          receivedWhere = where;
          return [];
        },
        count: async () => 0,
      },
    } as unknown as PrismaService);

    await service.findHistory(lecturer);

    assert.deepEqual(receivedWhere, { userId: lecturer.id });
  });

  it('rejects an inverted date range before querying the database', async () => {
    let queried = false;
    const service = new ExportHistoryService({
      exportLog: {
        findMany: async () => {
          queried = true;
          return [];
        },
        count: async () => 0,
      },
    } as unknown as PrismaService);

    await assert.rejects(
      service.findHistory(
        student,
        Object.assign(new ExportHistoryQueryDto(), {
          fromDate: '2026-07-01',
          toDate: '2026-06-01',
        }),
      ),
      /fromDate must be earlier than or equal to toDate/,
    );
    assert.equal(queried, false);
  });
});
