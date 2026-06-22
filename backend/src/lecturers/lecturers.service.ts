import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { LecturerQueryDto } from './dto/lecturer-query.dto';
import { UpdateLecturerDto } from './dto/update-lecturer.dto';

@Injectable()
export class LecturersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findAll(query: LecturerQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildLecturerWhere(query);
    const orderBy = this.buildLecturerOrderBy(query);
    const [data, total] = await Promise.all([
      this.prisma.lecturer.findMany({
        where,
        skip,
        take,
        orderBy,
        include: this.detailInclude(),
      }),
      this.prisma.lecturer.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async create(dto: CreateLecturerDto, actorUserId?: string) {
    const passwordHash = await this.usersService.hashPassword(dto.password);

    try {
      const lecturer = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: this.normalizeRequiredText(dto.fullName, 'Full name is required'),
            passwordHash,
            role: UserRole.LECTURER,
          },
        });

        return tx.lecturer.create({
          data: {
            userId: user.id,
            lecturerCode: this.normalizeRequiredText(dto.lecturerCode, 'Lecturer code is required'),
            department: this.valueOrUndefined(dto.department),
            phone: this.valueOrUndefined(dto.phone),
            academicTitle: this.valueOrUndefined(dto.academicTitle),
          },
          include: this.detailInclude(),
        });
      });

      await this.activityLogs.record({
        actorUserId,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: lecturer.userId,
        description: {
          role: UserRole.LECTURER,
          lecturerId: lecturer.id,
          lecturerCode: lecturer.lecturerCode,
        },
      });

      return lecturer;
    } catch (error) {
      this.handleKnownError(error, 'Lecturer email or code already exists');
    }
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    if (!lecturer) {
      throw new NotFoundException('Lecturer not found');
    }
    if (user.role !== UserRole.ADMIN && lecturer.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this lecturer');
    }

    return lecturer;
  }

  async update(id: string, dto: UpdateLecturerDto, actorUserId?: string) {
    const userData: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) {
      userData.email = dto.email;
    }
    if (dto.fullName !== undefined) {
      userData.fullName = this.normalizeRequiredText(dto.fullName, 'Full name is required');
    }
    const lecturerData = this.buildLecturerUpdateData(dto);

    try {
      const lecturer = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.lecturer.findUnique({
          where: { id },
          select: { userId: true },
        });
        if (!existing) {
          throw new NotFoundException('Lecturer not found');
        }

        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: existing.userId }, data: userData });
        }
        if (Object.keys(lecturerData).length > 0) {
          await tx.lecturer.update({ where: { id }, data: lecturerData });
        }

        return tx.lecturer.findUniqueOrThrow({
          where: { id },
          include: this.detailInclude(),
        });
      });

      await this.activityLogs.record({
        actorUserId,
        action: 'UPDATE_USER',
        entityType: 'Lecturer',
        entityId: id,
        description: { changedFields: Object.keys(dto) },
      });

      return lecturer;
    } catch (error) {
      this.handleKnownError(error, 'Lecturer email or code already exists');
    }
  }

  async deactivate(id: string, actorUserId?: string) {
    const userId = await this.getUserIdByLecturerId(id);
    return this.usersService.deactivate(userId, actorUserId);
  }

  async reactivate(id: string, actorUserId?: string) {
    const userId = await this.getUserIdByLecturerId(id);
    return this.usersService.reactivate(userId, actorUserId);
  }

  private buildLecturerWhere(query: LecturerQueryDto): Prisma.LecturerWhereInput {
    const status =
      query.status ??
      (query.isActive === undefined
        ? undefined
        : query.isActive
          ? UserStatus.ACTIVE
          : UserStatus.INACTIVE);

    return {
      ...(query.department
        ? { department: { equals: query.department, mode: 'insensitive' } }
        : {}),
      ...(status ? { user: { status } } : {}),
      ...(query.search
        ? {
            OR: [
              { lecturerCode: { contains: query.search, mode: 'insensitive' } },
              { department: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { academicTitle: { contains: query.search, mode: 'insensitive' } },
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private buildLecturerOrderBy(query: LecturerQueryDto): Prisma.LecturerOrderByWithRelationInput {
    const sortBy = ['lecturerCode', 'department', 'academicTitle', 'createdAt', 'updatedAt'].includes(
      query.sortBy ?? '',
    )
      ? query.sortBy!
      : 'createdAt';

    return { [sortBy]: query.sortOrder };
  }

  private buildLecturerUpdateData(dto: UpdateLecturerDto): Prisma.LecturerUpdateInput {
    const data: Prisma.LecturerUpdateInput = {};
    this.copyField(data, dto, 'lecturerCode');
    this.copyField(data, dto, 'department');
    this.copyField(data, dto, 'phone');
    this.copyField(data, dto, 'academicTitle');
    return data;
  }

  private async getUserIdByLecturerId(id: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!lecturer) {
      throw new NotFoundException('Lecturer not found');
    }

    return lecturer.userId;
  }

  private detailInclude() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    };
  }

  private valueOrUndefined<T>(value: T | undefined) {
    return value === undefined ? undefined : value;
  }

  private normalizeRequiredText(value: string, message: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private copyField<T extends object, K extends keyof T>(
    data: object,
    dto: T,
    field: K,
  ) {
    if (Object.prototype.hasOwnProperty.call(dto, field)) {
      (data as Record<string, unknown>)[field as string] = dto[field];
    }
  }

  private handleKnownError(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(message);
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Lecturer references invalid data');
      }
    }

    throw error;
  }
}
