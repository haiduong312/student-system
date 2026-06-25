import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StudentsService } from './students.service';

const studentUser: AuthenticatedUser = {
  id: 'user-a',
  email: 'user-a@example.edu',
  fullName: 'Student A',
  role: UserRole.STUDENT,
};

describe('StudentsService ownership', () => {
  it('does not return another student record when access policy denies it', async () => {
    let studentQueried = false;
    const service = new StudentsService(
      {
        student: {
          findUnique: async () => {
            studentQueried = true;
            return { id: 'student-b' };
          },
        },
      } as any,
      {} as any,
      {
        assertCanAccessStudent: async () => {
          throw new ForbiddenException('You do not have permission to access this student');
        },
      } as any,
      {} as any,
    );

    await assert.rejects(
      () => service.findOne(studentUser, 'student-b'),
      ForbiddenException,
    );
    assert.equal(studentQueried, false);
  });
});
