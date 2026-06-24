import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  CatalogStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { randomBytes } from 'crypto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { StudentAccessPolicyService } from '../common/student-access/student-access-policy.service';
import { buildPrivateUploadedFileUrlFromStoredUrl } from '../common/upload/file-upload.options';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ImportStudentRecordDto, ImportStudentsDto } from './dto/import-students.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

type StudentProfileFields = Pick<
  CreateStudentDto | UpdateStudentDto,
  | 'careerGoalId'
  | 'specializationId'
  | 'summary'
  | 'githubUrl'
  | 'linkedinUrl'
  | 'portfolioUrl'
>;
type StudentProfileUpsertData = {
  careerGoalId?: string | null;
  specializationId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
};
type ImportValidationResult =
  | { valid: true; record: ImportStudentRecordDto }
  | { valid: false; reason: string };

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly studentAccessPolicy: StudentAccessPolicyService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findAll(user: AuthenticatedUser, query: StudentQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = await this.buildStudentWhere(user, query);
    const orderBy = this.buildStudentOrderBy(query);
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take,
        orderBy,
        include: this.detailInclude(),
      }),
      this.prisma.student.count({ where }),
    ]);

    return buildPaginatedResult(
      data.map((student) => this.withPrivateAvatarUrl(student)),
      total,
      page,
      limit,
    );
  }

  async create(dto: CreateStudentDto, actorUserId?: string) {
    return this.createStudentRecord(dto, dto.password, actorUserId);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, id);

    const student = await this.prisma.student.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.withPrivateAvatarUrl(student);
  }

  async update(id: string, dto: UpdateStudentDto, actorUserId?: string) {
    await this.ensureExists(id);
    const userData: Prisma.UserUpdateInput = {};
    const studentData = this.buildStudentUpdateData(dto);
    const profileData = await this.buildProfileUpsertData(id, dto);

    if (dto.email !== undefined) {
      userData.email = dto.email;
    }
    if (dto.fullName !== undefined) {
      userData.fullName = this.normalizeRequiredText(dto.fullName, 'Full name is required');
    }

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.student.findUniqueOrThrow({
          where: { id },
          select: { userId: true },
        });

        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: existing.userId }, data: userData });
        }
        if (Object.keys(studentData).length > 0) {
          await tx.student.update({ where: { id }, data: studentData });
        }
        if (profileData) {
          await tx.studentProfile.upsert({
            where: { studentId: id },
            create: { studentId: id, ...profileData, lastUpdatedAt: new Date() },
            update: { ...profileData, lastUpdatedAt: new Date() },
          });
        }

        return tx.student.findUniqueOrThrow({
          where: { id },
          include: this.detailInclude(),
        });
      });

      await this.activityLogs.record({
        actorUserId,
        action: 'UPDATE_USER',
        entityType: 'Student',
        entityId: id,
        description: { changedFields: Object.keys(dto) },
      });

      return this.withPrivateAvatarUrl(student);
    } catch (error) {
      this.handleKnownError(error, 'Student email or code already exists');
    }
  }

  async deactivate(id: string, actorUserId?: string) {
    const userId = await this.getUserIdByStudentId(id);
    return this.usersService.deactivate(userId, actorUserId);
  }

  async reactivate(id: string, actorUserId?: string) {
    const userId = await this.getUserIdByStudentId(id);
    return this.usersService.reactivate(userId, actorUserId);
  }

  async importStudents(body: ImportStudentsDto | ImportStudentRecordDto[], actorUserId?: string) {
    const records = this.normalizeImportBody(body);
    const result: {
      created: number;
      skipped: number;
      failed: number;
      data: Array<{
        row: number;
        email: string;
        studentCode: string;
        studentId: string;
        userId: string;
        temporaryPassword?: string;
      }>;
      errors: Array<{ row: number; email?: string; studentCode?: string; reason: string }>;
    } = {
      created: 0,
      skipped: 0,
      failed: 0,
      data: [],
      errors: [],
    };

    for (const [index, rawRecord] of records.entries()) {
      const row = index + 1;
      const validation = this.validateImportRecord(rawRecord);
      if (!validation.valid) {
        result.failed += 1;
        result.errors.push({ row, reason: validation.reason });
        continue;
      }

      const record = validation.record;
      const duplicate = await this.findImportDuplicate(record);
      if (duplicate) {
        result.skipped += 1;
        result.errors.push({
          row,
          email: record.email,
          studentCode: record.studentCode,
          reason: duplicate,
        });
        continue;
      }

      const password = record.password ?? this.generateTemporaryPassword();
      try {
        const student = await this.createStudentRecord(
          record,
          password,
          actorUserId,
          Boolean(record.password),
        );
        result.created += 1;
        result.data.push({
          row,
          email: student.user.email,
          studentCode: student.studentCode,
          studentId: student.id,
          userId: student.userId,
          ...(record.password ? {} : { temporaryPassword: password }),
        });
      } catch (error) {
        if (
          error instanceof ConflictException ||
          (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        ) {
          result.skipped += 1;
          result.errors.push({
            row,
            email: record.email,
            studentCode: record.studentCode,
            reason: 'Email or student code already exists',
          });
          continue;
        }

        result.failed += 1;
        result.errors.push({
          row,
          email: record.email,
          studentCode: record.studentCode,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await this.activityLogs.record({
      actorUserId,
      action: 'IMPORT_STUDENTS',
      entityType: 'Student',
      description: {
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
      },
    });

    return result;
  }

  private async createStudentRecord(
    dto: CreateStudentDto | ImportStudentRecordDto,
    password: string,
    actorUserId?: string,
    passwordProvided = true,
  ) {
    const profileData = this.hasProfileFields(dto)
      ? await this.buildProfileUpsertData(undefined, dto)
      : null;
    const passwordHash = await this.usersService.hashPassword(password);

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: this.normalizeRequiredText(dto.fullName, 'Full name is required'),
            passwordHash,
            role: UserRole.STUDENT,
          },
        });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            studentCode: this.normalizeRequiredText(dto.studentCode, 'Student code is required'),
            className: this.valueOrUndefined(dto.className),
            major: this.valueOrUndefined(dto.major),
            academicYear: this.valueOrUndefined(dto.academicYear),
            phone: this.valueOrUndefined(dto.phone),
            dateOfBirth: 'dateOfBirth' in dto ? this.valueOrUndefined(dto.dateOfBirth) : undefined,
            avatarUrl: 'avatarUrl' in dto ? this.valueOrUndefined(dto.avatarUrl) : undefined,
          },
          include: this.detailInclude(),
        });

        if (profileData) {
          await tx.studentProfile.create({
            data: { studentId: student.id, ...profileData, lastUpdatedAt: new Date() },
          });
        }

        return tx.student.findUniqueOrThrow({
          where: { id: student.id },
          include: this.detailInclude(),
        });
      });

      await this.activityLogs.record({
        actorUserId,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: student.userId,
        description: {
          role: UserRole.STUDENT,
          studentId: student.id,
          studentCode: student.studentCode,
          passwordProvided,
        },
      });

      return this.withPrivateAvatarUrl(student);
    } catch (error) {
      this.handleKnownError(error, 'Student email or code already exists');
    }
  }

  private async buildStudentWhere(
    user: AuthenticatedUser,
    query: StudentQueryDto,
  ): Promise<Prisma.StudentWhereInput> {
    const status =
      query.status ??
      (query.isActive === undefined
        ? undefined
        : query.isActive
          ? UserStatus.ACTIVE
          : UserStatus.INACTIVE);
    const where: Prisma.StudentWhereInput = {
      ...(query.className ? { className: { equals: query.className, mode: 'insensitive' } } : {}),
      ...(query.major ? { major: { equals: query.major, mode: 'insensitive' } } : {}),
      ...(query.academicYear ? { academicYear: query.academicYear } : {}),
      ...(status ? { user: { status } } : {}),
      ...(query.search
        ? {
            OR: [
              { studentCode: { contains: query.search, mode: 'insensitive' } },
              { className: { contains: query.search, mode: 'insensitive' } },
              { major: { contains: query.search, mode: 'insensitive' } },
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    if (user.role === UserRole.ADMIN) {
      return where;
    }
    if (user.role === UserRole.LECTURER) {
      const lecturer = await this.prisma.lecturer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!lecturer) {
        throw new ForbiddenException('Current user is not a lecturer');
      }

      return {
        ...where,
        advisorAssignments: {
          some: {
            lecturerId: lecturer.id,
            status: AssignmentStatus.ACTIVE,
          },
        },
      };
    }

    throw new ForbiddenException('You do not have permission to list students');
  }

  private buildStudentOrderBy(query: StudentQueryDto): Prisma.StudentOrderByWithRelationInput {
    const sortBy = ['studentCode', 'className', 'major', 'academicYear', 'createdAt', 'updatedAt'].includes(
      query.sortBy ?? '',
    )
      ? query.sortBy!
      : 'createdAt';

    return { [sortBy]: query.sortOrder };
  }

  private buildStudentUpdateData(dto: UpdateStudentDto): Prisma.StudentUpdateInput {
    const data: Prisma.StudentUpdateInput = {};
    this.copyField(data, dto, 'studentCode');
    this.copyField(data, dto, 'className');
    this.copyField(data, dto, 'major');
    this.copyField(data, dto, 'academicYear');
    this.copyField(data, dto, 'phone');
    this.copyField(data, dto, 'dateOfBirth');
    this.copyField(data, dto, 'avatarUrl');
    return data;
  }

  private async buildProfileUpsertData(
    studentId: string | undefined,
    dto: StudentProfileFields,
  ): Promise<StudentProfileUpsertData | null> {
    const profileFields: Array<keyof StudentProfileFields> = [
      'careerGoalId',
      'specializationId',
      'summary',
      'githubUrl',
      'linkedinUrl',
      'portfolioUrl',
    ];
    if (!profileFields.some((field) => this.hasOwn(dto, field))) {
      return null;
    }

    const existingProfile = studentId
      ? await this.prisma.studentProfile.findUnique({
          where: { studentId },
          select: { careerGoalId: true, specializationId: true },
        })
      : null;
    const careerGoalProvided = this.hasOwn(dto, 'careerGoalId');
    const specializationProvided = this.hasOwn(dto, 'specializationId');
    const nextCareerGoalId = careerGoalProvided
      ? this.normalizeOptionalId(dto.careerGoalId, 'Career goal is required')
      : existingProfile?.careerGoalId ?? null;

    if (nextCareerGoalId) {
      await this.ensureActiveCareerGoal(nextCareerGoalId);
    }

    const data: StudentProfileUpsertData = {};
    if (careerGoalProvided) {
      data.careerGoalId = nextCareerGoalId;
    }
    if (specializationProvided) {
      data.specializationId = await this.resolveRequestedSpecialization(
        dto.specializationId,
        nextCareerGoalId,
      );
    } else if (careerGoalProvided) {
      data.specializationId = await this.resolveExistingSpecializationAfterCareerGoalChange(
        existingProfile?.specializationId ?? null,
        nextCareerGoalId,
      );
    }

    this.copyField(data, dto, 'summary');
    this.copyField(data, dto, 'githubUrl');
    this.copyField(data, dto, 'linkedinUrl');
    this.copyField(data, dto, 'portfolioUrl');

    return data;
  }

  private async resolveRequestedSpecialization(
    specializationId: string | null | undefined,
    careerGoalId: string | null,
  ) {
    const normalized = this.normalizeOptionalId(specializationId, 'Specialization is required');
    if (!normalized) {
      return null;
    }
    if (!careerGoalId) {
      throw new BadRequestException('Select a career goal before selecting a specialization');
    }

    await this.ensureActiveSpecializationBelongsToCareerGoal(normalized, careerGoalId);
    return normalized;
  }

  private async resolveExistingSpecializationAfterCareerGoalChange(
    specializationId: string | null,
    careerGoalId: string | null,
  ) {
    if (!specializationId || !careerGoalId) {
      return null;
    }
    const specialization = await this.prisma.specialization.findFirst({
      where: { id: specializationId, careerGoalId, status: CatalogStatus.ACTIVE },
      select: { id: true },
    });

    return specialization ? specializationId : null;
  }

  private async ensureActiveCareerGoal(id: string) {
    const careerGoal = await this.prisma.careerGoal.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!careerGoal) {
      throw new NotFoundException('Career goal not found');
    }
    if (careerGoal.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Career goal is not active');
    }
  }

  private async ensureActiveSpecializationBelongsToCareerGoal(id: string, careerGoalId: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      select: { id: true, careerGoalId: true, status: true },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }
    if (specialization.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Specialization is not active');
    }
    if (specialization.careerGoalId !== careerGoalId) {
      throw new BadRequestException('Specialization does not belong to the selected career goal');
    }
  }

  private normalizeImportBody(body: ImportStudentsDto | ImportStudentRecordDto[]) {
    const records = Array.isArray(body) ? body : body?.records;
    if (!Array.isArray(records)) {
      throw new BadRequestException('Import body must be an array or { records: [...] }');
    }
    if (!records.length) {
      throw new BadRequestException('Import records cannot be empty');
    }

    return records;
  }

  private validateImportRecord(rawRecord: unknown): ImportValidationResult {
    const record = plainToInstance(ImportStudentRecordDto, rawRecord);
    const errors = validateSync(record, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      return {
        valid: false,
        reason: errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join('; ') || 'Invalid import record',
      };
    }

    return { valid: true, record };
  }

  private async findImportDuplicate(record: ImportStudentRecordDto) {
    const [user, student] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: record.email }, select: { id: true } }),
      this.prisma.student.findUnique({
        where: { studentCode: record.studentCode },
        select: { id: true },
      }),
    ]);
    if (user) {
      return 'Email already exists';
    }
    if (student) {
      return 'Student code already exists';
    }

    return null;
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Student not found');
    }
  }

  private async getUserIdByStudentId(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student.userId;
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
      profile: {
        include: {
          careerGoal: true,
          specialization: true,
        },
      },
    };
  }

  private withPrivateAvatarUrl<T extends { avatarUrl?: string | null }>(student: T): T {
    return {
      ...student,
      avatarUrl: buildPrivateUploadedFileUrlFromStoredUrl(student.avatarUrl),
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

  private normalizeOptionalId(value: string | null | undefined, message: string) {
    if (value === undefined || value === null) {
      return null;
    }
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
    if (this.hasOwn(dto, field)) {
      (data as Record<string, unknown>)[field as string] = dto[field];
    }
  }

  private hasOwn<T extends object>(value: T, key: keyof T) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  private hasProfileFields(value: object): value is StudentProfileFields {
    return [
      'careerGoalId',
      'specializationId',
      'summary',
      'githubUrl',
      'linkedinUrl',
      'portfolioUrl',
    ].some((field) => Object.prototype.hasOwnProperty.call(value, field));
  }

  private generateTemporaryPassword() {
    return `Temp${randomBytes(6).toString('base64url')}1`;
  }

  private handleKnownError(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(message);
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Student references invalid data');
      }
    }

    throw error;
  }
}
