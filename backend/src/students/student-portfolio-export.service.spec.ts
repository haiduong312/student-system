import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StudentsService } from './students.service';

const studentUser: AuthenticatedUser = {
  id: 'student-user-1',
  email: 'student@example.com',
  fullName: 'Student One',
  role: UserRole.STUDENT,
};

function createService(prisma: object, accessPolicy: object) {
  return new StudentsService(
    prisma as never,
    {} as never,
    accessPolicy as never,
    {} as never,
  );
}

describe('StudentsService portfolio export scope', () => {
  it('maps a student user to their own student record', async () => {
    const checkedStudentIds: string[] = [];
    const queries: any[] = [];
    const service = createService(
      {
        student: {
          findUnique: async (query: any) => {
            queries.push(query);
            if (query.where.userId) {
              return { id: 'student-1' };
            }
            return { id: 'student-1', studentCode: 'SV001' };
          },
        },
      },
      {
        assertCanAccessStudent: async (
          _user: AuthenticatedUser,
          studentId: string,
        ) => checkedStudentIds.push(studentId),
      },
    );

    const snapshot = await service.findPortfolioForExport(studentUser);

    assert.equal(snapshot.id, 'student-1');
    assert.deepEqual(checkedStudentIds, ['student-1']);
    assert.deepEqual(queries[0], {
      where: { userId: studentUser.id },
      select: { id: true },
    });
    assert.equal(queries[1].where.id, 'student-1');
  });

  it('rejects a student requesting another portfolio before loading it', async () => {
    let accessChecked = false;
    const service = createService(
      {
        student: {
          findUnique: async () => ({ id: 'student-1' }),
        },
      },
      {
        assertCanAccessStudent: async () => {
          accessChecked = true;
        },
      },
    );

    await assert.rejects(
      service.findPortfolioForExport(studentUser, 'student-2'),
      /Students can only export their own portfolio/,
    );
    assert.equal(accessChecked, false);
  });

  it('requires lecturer and admin callers to select a student', async () => {
    const service = createService({}, {});

    await assert.rejects(
      service.findPortfolioForExport({
        ...studentUser,
        id: 'lecturer-user-1',
        role: UserRole.LECTURER,
      }),
      /studentId is required for lecturer and admin portfolio exports/,
    );
  });

  it('delegates lecturer assignment scope to the existing access policy', async () => {
    let snapshotLoaded = false;
    const lecturer = {
      ...studentUser,
      id: 'lecturer-user-1',
      role: UserRole.LECTURER,
    };
    const service = createService(
      {
        student: {
          findUnique: async () => {
            snapshotLoaded = true;
            return { id: 'student-2' };
          },
        },
      },
      {
        assertCanAccessStudent: async () => {
          throw new ForbiddenException('not actively assigned');
        },
      },
    );

    await assert.rejects(
      service.findPortfolioForExport(lecturer, 'student-2'),
      /not actively assigned/,
    );
    assert.equal(snapshotLoaded, false);
  });
});
