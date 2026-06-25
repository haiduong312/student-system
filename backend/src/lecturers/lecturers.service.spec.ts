import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { LecturersService } from './lecturers.service';

const user = (role: UserRole, id: string): AuthenticatedUser => ({
  id,
  email: `${id}@example.edu`,
  fullName: id,
  role,
});

describe('LecturersService ownership', () => {
  it('does not let one lecturer view another lecturer profile', async () => {
    const service = new LecturersService(
      {
        lecturer: {
          findUnique: async () => ({
            id: 'lecturer-b',
            userId: 'lecturer-user-b',
            user: {
              id: 'lecturer-user-b',
              fullName: 'Lecturer B',
              email: 'lecturer-b@example.edu',
              role: UserRole.LECTURER,
            },
          }),
        },
      } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () => service.findOne(user(UserRole.LECTURER, 'lecturer-user-a'), 'lecturer-b'),
      ForbiddenException,
    );
  });

  it('lets admins view any lecturer profile', async () => {
    const service = new LecturersService(
      {
        lecturer: {
          findUnique: async () => ({
            id: 'lecturer-b',
            userId: 'lecturer-user-b',
            user: {
              id: 'lecturer-user-b',
              fullName: 'Lecturer B',
              email: 'lecturer-b@example.edu',
              role: UserRole.LECTURER,
            },
          }),
        },
      } as any,
      {} as any,
      {} as any,
    );

    const result = await service.findOne(user(UserRole.ADMIN, 'admin-1'), 'lecturer-b');

    assert.equal(result.id, 'lecturer-b');
  });
});
