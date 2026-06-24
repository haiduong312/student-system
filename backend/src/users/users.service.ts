import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { buildPrivateUploadedFileUrlFromStoredUrl } from '../common/upload/file-upload.options';
import { PrismaService } from '../prisma/prisma.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  private readonly bcryptSaltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findAll(query?: UserQueryDto, paginated = false) {
    const where = this.buildUserWhere(query);
    const orderBy = this.buildUserOrderBy(query);

    if (!paginated) {
      const users = await this.prisma.user.findMany({
        where,
        orderBy,
        select: this.userListSelect(),
      });
      return users.map((user) => this.withPrivateStudentAvatarUrl(user));
    }

    const { page, limit, skip, take } = getPagination(query ?? new UserQueryDto());
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: this.userListSelect(),
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(
      data.map((user) => this.withPrivateStudentAvatarUrl(user)),
      total,
      page,
      limit,
    );
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

  async findProfileById(id: string) {
    const user = await this.prisma.user.findUnique({
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
    return user ? this.withPrivateStudentAvatarUrl(user) : null;
  }

  async findOneForAdmin(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userDetailSelect(),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.withPrivateStudentAvatarUrl(user);
  }

  async update(id: string, dto: UpdateUserDto, actorUserId?: string) {
    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) {
      data.fullName = this.normalizeRequiredText(dto.fullName, 'Full name is required');
    }
    if (dto.email !== undefined) {
      data.email = dto.email;
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { id },
          select: {
            id: true,
            student: { select: { id: true } },
            lecturer: { select: { id: true } },
          },
        });
        if (!existing) {
          throw new NotFoundException('User not found');
        }

        if (Object.keys(data).length > 0) {
          await tx.user.update({ where: { id }, data });
        }

        if (dto.phone !== undefined) {
          if (existing.student) {
            await tx.student.update({
              where: { id: existing.student.id },
              data: { phone: dto.phone },
            });
          } else if (existing.lecturer) {
            await tx.lecturer.update({
              where: { id: existing.lecturer.id },
              data: { phone: dto.phone },
            });
          } else {
            throw new BadRequestException('User does not have a student or lecturer profile');
          }
        }

        if (dto.avatarUrl !== undefined) {
          if (!existing.student) {
            throw new BadRequestException('Avatar can only be updated for student users');
          }
          await tx.student.update({
            where: { id: existing.student.id },
            data: { avatarUrl: dto.avatarUrl },
          });
        }

        return tx.user.findUniqueOrThrow({
          where: { id },
          select: this.userDetailSelect(),
        });
      });

      await this.activityLogs.record({
        actorUserId,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: id,
        description: { changedFields: Object.keys(dto) },
      });

      return this.withPrivateStudentAvatarUrl(user);
    } catch (error) {
      this.handleKnownError(error, 'Email already exists');
    }
  }

  async deactivate(id: string, actorUserId?: string) {
    if (actorUserId && actorUserId === id) {
      throw new BadRequestException('Administrators cannot deactivate their own account');
    }

    const user = await this.setStatus(id, UserStatus.INACTIVE, actorUserId, 'DEACTIVATE_USER');
    return { deactivated: true, user };
  }

  async reactivate(id: string, actorUserId?: string) {
    const user = await this.setStatus(id, UserStatus.ACTIVE, actorUserId, 'REACTIVATE_USER');
    return { reactivated: true, user };
  }

  async resetPassword(id: string, dto: ResetPasswordDto, actorUserId?: string) {
    await this.ensureExists(id);
    await this.updatePassword(id, dto.newPassword);
    await this.activityLogs.record({
      actorUserId,
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: id,
    });

    return { passwordReset: true };
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
    const passwordHash = await this.hashPassword(newPassword);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
      select: this.safeUserSelect(),
    });
  }

  hashPassword(password: string) {
    return bcrypt.hash(password, this.bcryptSaltRounds);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }

  private async setStatus(
    id: string,
    status: UserStatus,
    actorUserId: string | undefined,
    action: 'DEACTIVATE_USER' | 'REACTIVATE_USER',
  ) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          status,
          ...(status === UserStatus.INACTIVE ? { refreshTokenHash: null } : {}),
        },
        select: this.userDetailSelect(),
      });
      await this.activityLogs.record({
        actorUserId,
        action,
        entityType: 'User',
        entityId: id,
        description: { status },
      });

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }

  private buildUserWhere(query?: UserQueryDto): Prisma.UserWhereInput {
    const status =
      query?.status ??
      (query?.isActive === undefined
        ? undefined
        : query.isActive
          ? UserStatus.ACTIVE
          : UserStatus.INACTIVE);

    return {
      ...(query?.role ? { role: query.role } : {}),
      ...(status ? { status } : {}),
      ...(query?.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { student: { studentCode: { contains: query.search, mode: 'insensitive' } } },
              { lecturer: { lecturerCode: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildUserOrderBy(query?: UserQueryDto): Prisma.UserOrderByWithRelationInput {
    const sortBy = ['fullName', 'email', 'role', 'status', 'lastLoginAt', 'createdAt', 'updatedAt'].includes(
      query?.sortBy ?? '',
    )
      ? query!.sortBy!
      : 'createdAt';

    return { [sortBy]: query?.sortOrder ?? 'desc' };
  }

  private normalizeRequiredText(value: string, message: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private safeUserSelect() {
    return {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private userListSelect() {
    return {
      ...this.safeUserSelect(),
      student: {
        select: {
          id: true,
          studentCode: true,
          className: true,
          major: true,
          academicYear: true,
          phone: true,
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
    };
  }

  private userDetailSelect() {
    return {
      ...this.userListSelect(),
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
          profile: {
            include: {
              careerGoal: true,
              specialization: true,
            },
          },
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
    };
  }

  private withPrivateStudentAvatarUrl<
    T extends { student?: { avatarUrl?: string | null } | null },
  >(user: T): T {
    if (!user.student) {
      return user;
    }

    return {
      ...user,
      student: {
        ...user.student,
        avatarUrl: buildPrivateUploadedFileUrlFromStoredUrl(user.student.avatarUrl),
      },
    };
  }

  private handleKnownError(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(message);
      }
    }

    throw error;
  }
}
