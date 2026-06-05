import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EvidenceStatus, NotificationType, RoadmapItemStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NOTIFICATION_BATCH_SIZE } from '../domain/notification-window';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyProfilesNotUpdated() {
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let cursor: string | undefined;
    let processed = 0;

    do {
      const profiles = await this.prisma.studentProfile.findMany({
        where: {
          OR: [{ lastUpdatedAt: null }, { lastUpdatedAt: { lt: threshold } }],
        },
        take: NOTIFICATION_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        include: { student: { include: { user: true } } },
      });

      for (const profile of profiles) {
        await this.notificationsService.createOnce({
          userId: profile.student.userId,
          title: 'Profile update reminder',
          content: 'Your competency profile has not been updated for 30 days.',
          notificationType: NotificationType.PROFILE_REMINDER,
          relatedEntityType: 'STUDENT_PROFILE',
          relatedEntityId: profile.id,
          dedupWindowHours: 24,
        });
      }

      processed += profiles.length;
      cursor = profiles.at(-1)?.id;
      if (profiles.length < NOTIFICATION_BATCH_SIZE) {
        cursor = undefined;
      }
    } while (cursor);

    this.logger.log(`Profile update reminders scanned: ${processed}`);
  }

  @Cron('30 8 * * *')
  async notifyMissingCareerGoal() {
    let cursor: string | undefined;
    let processed = 0;

    do {
      const profiles = await this.prisma.studentProfile.findMany({
        where: { careerGoalId: null },
        take: NOTIFICATION_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { student: true },
        orderBy: { id: 'asc' },
      });

      for (const profile of profiles) {
        await this.notificationsService.createOnce({
          userId: profile.student.userId,
          title: 'Career goal required',
          content: 'Please select a career goal so the system can analyze your competency profile.',
          notificationType: NotificationType.PROFILE_REMINDER,
          relatedEntityType: 'STUDENT_PROFILE_CAREER_GOAL',
          relatedEntityId: profile.id,
          dedupWindowHours: 24,
        });
      }

      processed += profiles.length;
      cursor = profiles.at(-1)?.id;
      if (profiles.length < NOTIFICATION_BATCH_SIZE) {
        cursor = undefined;
      }
    } while (cursor);

    this.logger.log(`Missing career goal reminders scanned: ${processed}`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async notifyRejectedEvidences() {
    let cursor: string | undefined;
    let processed = 0;

    do {
      const evidences = await this.prisma.evidence.findMany({
        where: { status: EvidenceStatus.REJECTED },
        take: NOTIFICATION_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        include: { student: true },
      });

      for (const evidence of evidences) {
        await this.notificationsService.createOnce({
          userId: evidence.student.userId,
          title: 'Evidence rejected',
          content: evidence.reviewerNote
            ? `Your evidence was rejected: ${evidence.reviewerNote}`
            : 'Your evidence was rejected. Please review and upload a valid proof.',
          notificationType: NotificationType.EVIDENCE_REJECTED,
          relatedEntityType: 'EVIDENCE',
          relatedEntityId: evidence.id,
          dedupWindowHours: 24 * 30,
        });
      }

      processed += evidences.length;
      cursor = evidences.at(-1)?.id;
      if (evidences.length < NOTIFICATION_BATCH_SIZE) {
        cursor = undefined;
      }
    } while (cursor);

    this.logger.log(`Rejected evidence notifications scanned: ${processed}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyOverdueRoadmapItems() {
    const today = new Date();
    let cursor: string | undefined;
    let processed = 0;

    do {
      const items = await this.prisma.roadmapItem.findMany({
        where: {
          deadline: { lt: today },
          status: { in: [RoadmapItemStatus.TODO, RoadmapItemStatus.IN_PROGRESS] },
        },
        take: NOTIFICATION_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        include: {
          roadmap: {
            include: {
              student: true,
            },
          },
        },
      });

      for (const item of items) {
        await this.notificationsService.createOnce({
          userId: item.roadmap.student.userId,
          title: 'Roadmap item overdue',
          content: `The roadmap item "${item.title}" is overdue.`,
          notificationType: NotificationType.ROADMAP_REMINDER,
          relatedEntityType: 'ROADMAP_ITEM',
          relatedEntityId: item.id,
          dedupWindowHours: 24,
        });
      }

      processed += items.length;
      cursor = items.at(-1)?.id;
      if (items.length < NOTIFICATION_BATCH_SIZE) {
        cursor = undefined;
      }
    } while (cursor);

    this.logger.log(`Overdue roadmap items scanned: ${processed}`);
  }

  @Cron('30 9 * * *')
  async notifyWeakProfiles() {
    let cursor: string | undefined;
    let processed = 0;

    do {
      const profiles = await this.prisma.studentProfile.findMany({
        where: {
          OR: [
            { completionPercent: { lt: 50 } },
            { matchPercent: { lt: 40 } },
            { riskScore: { gte: 60 } },
          ],
        },
        take: NOTIFICATION_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        include: { student: true },
      });

      for (const profile of profiles) {
        await this.notificationsService.createOnce({
          userId: profile.student.userId,
          title: 'Weak profile alert',
          content:
            'Your competency profile needs improvement. Please update skills, projects, evidences, or roadmap progress.',
          notificationType: NotificationType.WEAK_PROFILE_ALERT,
          relatedEntityType: 'STUDENT_PROFILE',
          relatedEntityId: profile.id,
          dedupWindowHours: 24,
        });
      }

      processed += profiles.length;
      cursor = profiles.at(-1)?.id;
      if (profiles.length < NOTIFICATION_BATCH_SIZE) {
        cursor = undefined;
      }
    } while (cursor);

    this.logger.log(`Weak profile alerts scanned: ${processed}`);
  }
}
