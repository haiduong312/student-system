import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { buildPaginatedResult } from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ExportHistoryQueryDto } from './dto/export-history-query.dto';

@Injectable()
export class ExportHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findHistory(
    user: AuthenticatedUser,
    query: ExportHistoryQueryDto = new ExportHistoryQueryDto(),
  ) {
    const page = query.current ?? query.page ?? 1;
    const limit = query.pageSize ?? query.limit ?? 20;
    const createdAt = this.buildCreatedAtFilter(query);
    const isAdmin = user.role === UserRole.ADMIN;
    const where: Prisma.ExportLogWhereInput = {
      ...(isAdmin ? {} : { userId: user.id }),
      ...(query.exportType ? { exportType: query.exportType } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.exportLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          exportType: true,
          fileUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.exportLog.count({ where }),
    ]);

    const data = logs.map((log) => {
      const item = {
        id: log.id,
        exportType: log.exportType,
        fileUrl: log.fileUrl,
        createdAt: log.createdAt,
      };

      return isAdmin ? { ...item, userId: log.userId } : item;
    });

    return buildPaginatedResult(data, total, page, limit);
  }

  private buildCreatedAtFilter(
    query: ExportHistoryQueryDto,
  ): Prisma.DateTimeFilter | undefined {
    const fromDate = query.fromDate
      ? this.parseDate(query.fromDate, false)
      : undefined;
    const toDate = query.toDate ? this.parseDate(query.toDate, true) : undefined;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'fromDate must be earlier than or equal to toDate',
      );
    }
    if (!fromDate && !toDate) {
      return undefined;
    }

    return {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  private parseDate(value: string, inclusiveEndOfDay: boolean) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid export history date filter');
    }
    if (inclusiveEndOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(23, 59, 59, 999);
    }

    return date;
  }
}
