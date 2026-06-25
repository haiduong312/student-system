import {
  NotificationType,
  RoadmapItemStatus,
  RoadmapStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotificationSchedulerService } from './notification-scheduler.service';

describe('NotificationSchedulerService overdue roadmap reminders', () => {
  it('notifies only overdue active roadmap items and deduplicates repeated scheduler runs', async () => {
    const overdue = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const items = [
      {
        id: 'item-active-todo',
        title: 'Finish portfolio task',
        deadline: overdue,
        status: RoadmapItemStatus.TODO,
        roadmap: {
          status: RoadmapStatus.ACTIVE,
          student: { userId: 'user-1' },
        },
      },
      {
        id: 'item-active-in-progress',
        title: 'Practice interview',
        deadline: overdue,
        status: RoadmapItemStatus.IN_PROGRESS,
        roadmap: {
          status: RoadmapStatus.ACTIVE,
          student: { userId: 'user-2' },
        },
      },
      {
        id: 'item-archived',
        title: 'Archived item',
        deadline: overdue,
        status: RoadmapItemStatus.TODO,
        roadmap: {
          status: RoadmapStatus.ARCHIVED,
          student: { userId: 'user-archived' },
        },
      },
      {
        id: 'item-cancelled-roadmap',
        title: 'Cancelled roadmap item',
        deadline: overdue,
        status: RoadmapItemStatus.TODO,
        roadmap: {
          status: RoadmapStatus.CANCELLED,
          student: { userId: 'user-cancelled-roadmap' },
        },
      },
      {
        id: 'item-completed-roadmap',
        title: 'Completed roadmap item',
        deadline: overdue,
        status: RoadmapItemStatus.TODO,
        roadmap: {
          status: RoadmapStatus.COMPLETED,
          student: { userId: 'user-completed-roadmap' },
        },
      },
      {
        id: 'item-done',
        title: 'Done item',
        deadline: overdue,
        status: RoadmapItemStatus.DONE,
        roadmap: {
          status: RoadmapStatus.ACTIVE,
          student: { userId: 'user-done' },
        },
      },
      {
        id: 'item-not-overdue',
        title: 'Future item',
        deadline: future,
        status: RoadmapItemStatus.TODO,
        roadmap: {
          status: RoadmapStatus.ACTIVE,
          student: { userId: 'user-future' },
        },
      },
    ];
    let whereArg: any;
    const createdNotifications: any[] = [];
    const dedupKeys = new Set<string>();
    const service = new NotificationSchedulerService(
      {
        roadmapItem: {
          findMany: async (args: any) => {
            whereArg = args.where;
            return items.filter(
              (item) =>
                item.deadline < args.where.deadline.lt &&
                args.where.status.in.includes(item.status) &&
                item.roadmap.status === args.where.roadmap.status,
            );
          },
        },
      } as any,
      {
        createOnce: async (input: any) => {
          const key = [
            input.userId,
            input.notificationType,
            input.relatedEntityType,
            input.relatedEntityId,
          ].join(':');
          if (dedupKeys.has(key)) {
            return { id: `existing-${input.relatedEntityId}` };
          }

          dedupKeys.add(key);
          createdNotifications.push(input);
          return { id: `notification-${createdNotifications.length}` };
        },
      } as any,
    );
    (service as any).logger = { log: () => undefined };

    await service.notifyOverdueRoadmapItems();
    await service.notifyOverdueRoadmapItems();

    assert.deepEqual(whereArg.status.in, [
      RoadmapItemStatus.TODO,
      RoadmapItemStatus.IN_PROGRESS,
    ]);
    assert.equal(whereArg.roadmap.status, RoadmapStatus.ACTIVE);
    assert.deepEqual(
      createdNotifications.map((notification) => notification.relatedEntityId),
      ['item-active-todo', 'item-active-in-progress'],
    );
    assert.deepEqual(
      createdNotifications.map((notification) => notification.userId),
      ['user-1', 'user-2'],
    );
    assert.equal(
      createdNotifications.every(
        (notification) =>
          notification.notificationType === NotificationType.ROADMAP_REMINDER &&
          notification.relatedEntityType === 'ROADMAP_ITEM' &&
          notification.dedupWindowHours === 24,
      ),
      true,
    );
  });
});
