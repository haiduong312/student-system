import { NotFoundException } from '@nestjs/common';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService ownership', () => {
  it('does not mark another user notification as read', async () => {
    let updateCalled = false;
    const service = new NotificationsService({
      notification: {
        findFirst: async ({ where }: any) =>
          where.id === 'notification-b' && where.userId === 'user-b'
            ? { id: 'notification-b' }
            : null,
        update: async () => {
          updateCalled = true;
          return {};
        },
      },
    } as any);

    await assert.rejects(
      () => service.markAsRead('user-a', 'notification-b'),
      NotFoundException,
    );
    assert.equal(updateCalled, false);
  });

  it('marks only the current user notification as read', async () => {
    let updateArgs: any;
    const service = new NotificationsService({
      notification: {
        findFirst: async ({ where }: any) =>
          where.id === 'notification-a' && where.userId === 'user-a'
            ? { id: 'notification-a' }
            : null,
        update: async (args: any) => {
          updateArgs = args;
          return { id: 'notification-a', isRead: true };
        },
      },
    } as any);

    const result = await service.markAsRead('user-a', 'notification-a');

    assert.deepEqual(updateArgs, {
      where: { id: 'notification-a' },
      data: { isRead: true },
    });
    assert.equal(result.isRead, true);
  });

  it('does not mark another user notification as unread', async () => {
    let updateCalled = false;
    const prisma = {
      notification: {
        findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
          where.id === 'notification-b' && where.userId === 'user-b'
            ? { id: 'notification-b' }
            : null,
        update: async () => {
          updateCalled = true;
          return {};
        },
      },
    } as unknown as PrismaService;
    const service = new NotificationsService(prisma);

    await assert.rejects(
      () => service.markAsUnread('user-a', 'notification-b'),
      NotFoundException,
    );
    assert.equal(updateCalled, false);
  });

  it('marks only the current user notification as unread', async () => {
    let updateArgs: unknown;
    const prisma = {
      notification: {
        findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
          where.id === 'notification-a' && where.userId === 'user-a'
            ? { id: 'notification-a' }
            : null,
        update: async (args: unknown) => {
          updateArgs = args;
          return { id: 'notification-a', isRead: false };
        },
      },
    } as unknown as PrismaService;
    const service = new NotificationsService(prisma);

    const result = await service.markAsUnread('user-a', 'notification-a');

    assert.deepEqual(updateArgs, {
      where: { id: 'notification-a' },
      data: { isRead: false },
    });
    assert.equal(result.isRead, false);
  });
});
