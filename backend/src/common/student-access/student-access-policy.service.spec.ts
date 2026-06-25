import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { StudentAccessPolicyService } from './student-access-policy.service';

const user = (role: UserRole, id: string): AuthenticatedUser => ({
  id,
  email: `${id}@example.edu`,
  fullName: id,
  role,
});

function createPolicy() {
  const students = [
    { id: 'student-a', userId: 'user-a' },
    { id: 'student-b', userId: 'user-b' },
  ];
  const lecturers = [{ id: 'lecturer-a', userId: 'lecturer-user-a' }];
  const assignments = [
    {
      id: 'assignment-a',
      lecturerId: 'lecturer-a',
      studentId: 'student-a',
      status: AssignmentStatus.ACTIVE,
    },
    {
      id: 'assignment-inactive',
      lecturerId: 'lecturer-a',
      studentId: 'student-b',
      status: AssignmentStatus.INACTIVE,
    },
  ];

  return new StudentAccessPolicyService({
    student: {
      findUnique: async ({ where }: any) => {
        if (where.id) {
          return students.find((student) => student.id === where.id) ?? null;
        }
        return students.find((student) => student.userId === where.userId) ?? null;
      },
    },
    lecturer: {
      findUnique: async ({ where }: any) =>
        lecturers.find((lecturer) => lecturer.userId === where.userId) ?? null,
    },
    advisorAssignment: {
      findFirst: async ({ where }: any) =>
        assignments.find(
          (assignment) =>
            assignment.lecturerId === where.lecturerId &&
            assignment.studentId === where.studentId &&
            assignment.status === where.status,
        ) ?? null,
    },
  } as any);
}

describe('StudentAccessPolicyService ownership rules', () => {
  it('allows a student to access only their own student record', async () => {
    const policy = createPolicy();

    await policy.assertCanAccessStudent(user(UserRole.STUDENT, 'user-a'), 'student-a');
    await assert.rejects(
      () => policy.assertCanAccessStudent(user(UserRole.STUDENT, 'user-a'), 'student-b'),
      ForbiddenException,
    );
  });

  it('allows lecturers only for actively assigned students and admins for all students', async () => {
    const policy = createPolicy();

    await policy.assertCanAccessStudent(
      user(UserRole.LECTURER, 'lecturer-user-a'),
      'student-a',
    );
    await assert.rejects(
      () =>
        policy.assertCanAccessStudent(
          user(UserRole.LECTURER, 'lecturer-user-a'),
          'student-b',
        ),
      ForbiddenException,
    );
    await policy.assertCanAccessStudent(user(UserRole.ADMIN, 'admin-1'), 'student-b');
  });

  it('does not let students review evidence and returns not found for unknown students', async () => {
    const policy = createPolicy();

    await assert.rejects(
      () =>
        policy.assertCanReviewStudentEvidence(
          user(UserRole.STUDENT, 'user-a'),
          'student-a',
        ),
      ForbiddenException,
    );
    await assert.rejects(
      () => policy.assertCanAccessStudent(user(UserRole.ADMIN, 'admin-1'), 'missing'),
      NotFoundException,
    );
  });
});
