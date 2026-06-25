import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdvisorReviewsService } from './advisor-reviews.service';

const lecturer: AuthenticatedUser = {
  id: 'lecturer-user-a',
  email: 'lecturer-a@example.edu',
  fullName: 'Lecturer A',
  role: UserRole.LECTURER,
};

describe('AdvisorReviewsService ownership', () => {
  it('does not let an unassigned lecturer create a review for a student', async () => {
    let createCalled = false;
    const service = new AdvisorReviewsService(
      {
        advisorReview: {
          create: async () => {
            createCalled = true;
            return {};
          },
        },
      } as any,
      {
        assertCanAccessStudent: async () => {
          throw new ForbiddenException('You do not have permission to access this student');
        },
      } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () =>
        service.createForStudent(lecturer, 'student-b', {
          reviewContent: 'Needs practice',
        }),
      ForbiddenException,
    );
    assert.equal(createCalled, false);
  });

  it('does not return a review for a student the current user cannot access', async () => {
    const service = new AdvisorReviewsService(
      {
        advisorReview: {
          findUnique: async () => ({
            id: 'review-1',
            studentId: 'student-b',
            student: {},
            lecturer: {},
          }),
        },
      } as any,
      {
        assertCanAccessStudent: async () => {
          throw new ForbiddenException('You do not have permission to access this student');
        },
      } as any,
      {} as any,
      {} as any,
    );

    await assert.rejects(
      () => service.findOne(lecturer, 'review-1'),
      ForbiddenException,
    );
  });
});
