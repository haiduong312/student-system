import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus, Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { AdvisorAssignmentQueryDto } from './dto/advisor-assignment-query.dto';
import { CreateAdvisorAssignmentDto } from './dto/create-advisor-assignment.dto';
import { UpdateAdvisorAssignmentDto } from './dto/update-advisor-assignment.dto';

const SORTABLE_FIELDS = new Set(['assignedAt', 'status']);

export interface LecturerStudentExportRecord {
  assignedAt: Date;
  lecturer: {
    lecturerCode: string;
    user: {
      fullName: string;
    };
  };
  student: {
    studentCode: string;
    className: string | null;
    major: string | null;
    user: {
      fullName: string;
      email: string;
    };
  };
}

@Injectable()
export class AdvisorAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdvisorAssignmentDto, assignedById: string) {
    await Promise.all([
      this.ensureLecturerExists(dto.lecturerId),
      this.ensureStudentExists(dto.studentId),
    ]);

    try {
      return await this.prisma.advisorAssignment.create({
        data: { ...dto, assignedById },
        include: this.includeRelations(),
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: AdvisorAssignmentQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.AdvisorAssignmentWhereInput = {
      ...(query.lecturerId ? { lecturerId: query.lecturerId } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                lecturer: {
                  lecturerCode: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                lecturer: {
                  user: { fullName: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                lecturer: {
                  user: { email: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                student: {
                  studentCode: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                student: {
                  user: { fullName: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                student: {
                  user: { email: { contains: query.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '') ? query.sortBy! : 'assignedAt';

    const [data, total] = await Promise.all([
      this.prisma.advisorAssignment.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.includeRelations(),
      }),
      this.prisma.advisorAssignment.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findActiveStudentsForExport(
    user: AuthenticatedUser,
    query: AdvisorAssignmentQueryDto,
  ): Promise<LecturerStudentExportRecord[]> {
    if (query.status && query.status !== AssignmentStatus.ACTIVE) {
      throw new BadRequestException('Only active advisor assignments can be exported');
    }

    const lecturerId = await this.resolveExportLecturerId(user, query.lecturerId);
    const where: Prisma.AdvisorAssignmentWhereInput = {
      lecturerId,
      status: AssignmentStatus.ACTIVE,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...this.buildSearchWhere(query.search),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '') ? query.sortBy! : 'assignedAt';

    return this.prisma.advisorAssignment.findMany({
      where,
      orderBy: { [sortBy]: query.sortOrder },
      select: {
        assignedAt: true,
        lecturer: {
          select: {
            lecturerCode: true,
            user: { select: { fullName: true } },
          },
        },
        student: {
          select: {
            studentCode: true,
            className: true,
            major: true,
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.advisorAssignment.findUnique({
      where: { id },
      include: this.includeRelations(),
    });
    if (!assignment) {
      throw new NotFoundException('Advisor assignment not found');
    }

    return assignment;
  }

  async update(id: string, dto: UpdateAdvisorAssignmentDto) {
    await this.ensureExists(id);
    await Promise.all([
      dto.lecturerId ? this.ensureLecturerExists(dto.lecturerId) : Promise.resolve(),
      dto.studentId ? this.ensureStudentExists(dto.studentId) : Promise.resolve(),
    ]);

    try {
      return await this.prisma.advisorAssignment.update({
        where: { id },
        data: dto,
        include: this.includeRelations(),
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.advisorAssignment.delete({ where: { id } });

    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.advisorAssignment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Advisor assignment not found');
    }
  }

  private async ensureLecturerExists(id: string) {
    const exists = await this.prisma.lecturer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Lecturer not found');
    }
  }

  private async ensureStudentExists(id: string) {
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Student not found');
    }
  }

  private async resolveExportLecturerId(
    user: AuthenticatedUser,
    requestedLecturerId?: string,
  ): Promise<string> {
    if (user.role === UserRole.LECTURER) {
      const lecturer = await this.prisma.lecturer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!lecturer) {
        throw new ForbiddenException('Lecturer profile was not found for current user');
      }
      if (requestedLecturerId && requestedLecturerId !== lecturer.id) {
        throw new ForbiddenException(
          'Lecturers can only export their own assigned students',
        );
      }

      return lecturer.id;
    }

    if (user.role === UserRole.ADMIN) {
      if (!requestedLecturerId) {
        throw new BadRequestException('lecturerId is required for admin export');
      }
      await this.ensureLecturerExists(requestedLecturerId);

      return requestedLecturerId;
    }

    throw new ForbiddenException(
      'You do not have permission to export lecturer students',
    );
  }

  private buildSearchWhere(search?: string): Prisma.AdvisorAssignmentWhereInput {
    if (!search) {
      return {};
    }

    return {
      OR: [
        {
          lecturer: {
            lecturerCode: { contains: search, mode: 'insensitive' },
          },
        },
        {
          lecturer: {
            user: { fullName: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          lecturer: {
            user: { email: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          student: {
            studentCode: { contains: search, mode: 'insensitive' },
          },
        },
        {
          student: {
            user: { fullName: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          student: {
            user: { email: { contains: search, mode: 'insensitive' } },
          },
        },
      ],
    };
  }

  private includeRelations() {
    return {
      lecturer: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      student: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      assignedBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    };
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Advisor assignment already exists');
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Advisor assignment references invalid data');
      }
    }

    throw error;
  }
}
