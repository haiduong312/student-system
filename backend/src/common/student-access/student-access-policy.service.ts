import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentAccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessStudent(user: AuthenticatedUser, studentId: string) {
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.STUDENT) {
      const currentStudentId = await this.getStudentIdByUserId(user.id);
      return currentStudentId === studentId;
    }

    if (user.role === UserRole.LECTURER) {
      return this.isLecturerAssignedToStudent(user.id, studentId);
    }

    return false;
  }

  async assertCanAccessStudent(
    user: AuthenticatedUser,
    studentId: string,
    message = 'You do not have permission to access this student',
  ) {
    await this.ensureStudentExists(studentId);

    if (await this.canAccessStudent(user, studentId)) {
      return;
    }

    throw new ForbiddenException(message);
  }

  async canReviewStudentEvidence(user: AuthenticatedUser, studentId: string) {
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.LECTURER) {
      return this.isLecturerAssignedToStudent(user.id, studentId);
    }

    return false;
  }

  async assertCanReviewStudentEvidence(
    user: AuthenticatedUser,
    studentId: string,
    message = 'You do not have permission to review this evidence',
  ) {
    await this.ensureStudentExists(studentId);

    if (await this.canReviewStudentEvidence(user, studentId)) {
      return;
    }

    throw new ForbiddenException(message);
  }

  private async ensureStudentExists(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async getStudentIdByUserId(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    return student?.id ?? null;
  }

  private async isLecturerAssignedToStudent(userId: string, studentId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!lecturer) {
      return false;
    }

    const assignment = await this.prisma.advisorAssignment.findFirst({
      where: {
        lecturerId: lecturer.id,
        studentId,
        status: AssignmentStatus.ACTIVE,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }
}
