import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AdvisorAssignmentsService } from './advisor-assignments.service';
import { AdvisorAssignmentQueryDto } from './dto/advisor-assignment-query.dto';

const lecturerUser: AuthenticatedUser = {
  id: 'lecturer-user-1',
  email: 'lecturer@example.com',
  fullName: 'Lecturer One',
  role: UserRole.LECTURER,
};

describe('AdvisorAssignmentsService export scope', () => {
  it('maps current user to lecturer and only queries active own assignments', async () => {
    let receivedFindMany: Record<string, unknown> | undefined;
    const prisma = {
      lecturer: {
        findUnique: async (input: unknown) => {
          assert.deepEqual(input, {
            where: { userId: lecturerUser.id },
            select: { id: true },
          });
          return { id: 'lecturer-1' };
        },
      },
      advisorAssignment: {
        findMany: async (input: Record<string, unknown>) => {
          receivedFindMany = input;
          return [];
        },
      },
    } as unknown as PrismaService;
    const service = new AdvisorAssignmentsService(prisma);
    const query = Object.assign(new AdvisorAssignmentQueryDto(), {
      search: 'SV001',
    });

    await service.findActiveStudentsForExport(lecturerUser, query);

    assert.deepEqual(receivedFindMany?.where, {
      lecturerId: 'lecturer-1',
      status: AssignmentStatus.ACTIVE,
      OR: [
        {
          lecturer: {
            lecturerCode: { contains: 'SV001', mode: 'insensitive' },
          },
        },
        {
          lecturer: {
            user: { fullName: { contains: 'SV001', mode: 'insensitive' } },
          },
        },
        {
          lecturer: {
            user: { email: { contains: 'SV001', mode: 'insensitive' } },
          },
        },
        {
          student: {
            studentCode: { contains: 'SV001', mode: 'insensitive' },
          },
        },
        {
          student: {
            user: { fullName: { contains: 'SV001', mode: 'insensitive' } },
          },
        },
        {
          student: {
            user: { email: { contains: 'SV001', mode: 'insensitive' } },
          },
        },
      ],
    });
  });

  it('rejects a lecturer requesting another lecturer scope', async () => {
    let queriedAssignments = false;
    const prisma = {
      lecturer: {
        findUnique: async () => ({ id: 'lecturer-1' }),
      },
      advisorAssignment: {
        findMany: async () => {
          queriedAssignments = true;
          return [];
        },
      },
    } as unknown as PrismaService;
    const service = new AdvisorAssignmentsService(prisma);
    const query = Object.assign(new AdvisorAssignmentQueryDto(), {
      lecturerId: 'lecturer-2',
    });

    await assert.rejects(
      service.findActiveStudentsForExport(lecturerUser, query),
      /only export their own assigned students/,
    );
    assert.equal(queriedAssignments, false);
  });

  it('requires an explicit lecturerId for admin exports', async () => {
    const service = new AdvisorAssignmentsService({} as PrismaService);

    await assert.rejects(
      service.findActiveStudentsForExport(
        { ...lecturerUser, id: 'admin-1', role: UserRole.ADMIN },
        new AdvisorAssignmentQueryDto(),
      ),
      /lecturerId is required for admin export/,
    );
  });

  it('lets an admin export one explicitly selected lecturer active scope', async () => {
    let receivedFindMany: Record<string, unknown> | undefined;
    const prisma = {
      lecturer: {
        findUnique: async () => ({ id: 'lecturer-2' }),
      },
      advisorAssignment: {
        findMany: async (input: Record<string, unknown>) => {
          receivedFindMany = input;
          return [];
        },
      },
    } as unknown as PrismaService;
    const service = new AdvisorAssignmentsService(prisma);
    const query = Object.assign(new AdvisorAssignmentQueryDto(), {
      lecturerId: 'lecturer-2',
    });

    await service.findActiveStudentsForExport(
      { ...lecturerUser, id: 'admin-1', role: UserRole.ADMIN },
      query,
    );

    assert.deepEqual(receivedFindMany?.where, {
      lecturerId: 'lecturer-2',
      status: AssignmentStatus.ACTIVE,
    });
  });

  it('rejects inactive assignment exports before accessing the database', async () => {
    const service = new AdvisorAssignmentsService({} as PrismaService);
    const query = Object.assign(new AdvisorAssignmentQueryDto(), {
      status: AssignmentStatus.INACTIVE,
    });

    await assert.rejects(
      service.findActiveStudentsForExport(lecturerUser, query),
      /Only active advisor assignments can be exported/,
    );
  });
});
