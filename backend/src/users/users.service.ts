import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly bcryptSaltRounds = 12;

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.safeUserSelect(),
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findProfileById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.safeUserSelect(),
        student: {
          select: {
            id: true,
            studentCode: true,
            className: true,
            major: true,
            academicYear: true,
            phone: true,
            dateOfBirth: true,
            avatarUrl: true,
          },
        },
        lecturer: {
          select: {
            id: true,
            lecturerCode: true,
            department: true,
            phone: true,
            academicTitle: true,
          },
        },
      },
    });
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, this.bcryptSaltRounds);

    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
      select: this.safeUserSelect(),
    });
  }

  clearRefreshTokenHash(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
      select: this.safeUserSelect(),
    });
  }

  markLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      select: this.safeUserSelect(),
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptSaltRounds);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
      select: this.safeUserSelect(),
    });
  }

  private safeUserSelect() {
    return {
      id: true,
      fullName: true,
      email: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
