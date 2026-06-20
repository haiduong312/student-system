import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationLogStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_DEDUP_WINDOW_HOURS } from './domain/notification-window';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string, query: NotificationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(typeof query.isRead === 'boolean' ? { isRead: query.isRead } : {}),
      ...(query.notificationType ? { notificationType: query.notificationType } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortBy = ['createdAt', 'isRead', 'notificationType'].includes(query.sortBy ?? '')
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { updated: result.count };
  }

  async createOnce(input: {
    userId: string;
    title: string;
    content: string;
    notificationType: NotificationType;
    relatedEntityType?: string;
    relatedEntityId?: string;
    dedupWindowHours?: number;
  }) {
    const since = new Date(
      Date.now() -
        (input.dedupWindowHours ?? NOTIFICATION_DEDUP_WINDOW_HOURS) * 60 * 60 * 1000,
    );

    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: input.userId,
        notificationType: input.notificationType,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        createdAt: { gte: since },
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        content: input.content,
        notificationType: input.notificationType,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        logs: {
          create: {
            userId: input.userId,
            channel: NotificationChannel.IN_APP,
            status: NotificationLogStatus.SENT,
            sentAt: new Date(),
          },
        },
      },
    });
  }
}
