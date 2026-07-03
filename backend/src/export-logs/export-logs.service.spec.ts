import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExportType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExportLogsService } from './export-logs.service';

describe('ExportLogsService', () => {
  it('creates and returns an export log when Prisma succeeds', async () => {
    const createdAt = new Date('2026-07-03T02:30:00.000Z');
    const createdRecord = {
      id: 'export-log-1',
      userId: 'user-1',
      exportType: ExportType.STUDENTS_EXCEL,
      fileUrl: '/api/exports/files/students.xlsx',
      createdAt,
    };
    let createInput: unknown;
    const service = new ExportLogsService({
      exportLog: {
        create: async (input: unknown) => {
          createInput = input;
          return createdRecord;
        },
      },
    } as unknown as PrismaService);

    const result = await service.record({
      userId: 'user-1',
      exportType: ExportType.STUDENTS_EXCEL,
      fileUrl: '/api/exports/files/students.xlsx',
    });

    assert.deepEqual(createInput, {
      data: {
        userId: 'user-1',
        exportType: ExportType.STUDENTS_EXCEL,
        fileUrl: '/api/exports/files/students.xlsx',
      },
    });
    assert.equal(result, createdRecord);
  });

  it('warns and returns null without throwing when Prisma fails', async () => {
    const warnMessages: unknown[] = [];
    const service = new ExportLogsService({
      exportLog: {
        create: async () => {
          throw new Error('database unavailable');
        },
      },
    } as unknown as PrismaService);
    (
      service as unknown as {
        logger: { warn: (message: unknown) => void };
      }
    ).logger = {
      warn: (message: unknown) => warnMessages.push(message),
    };
    let result: Awaited<ReturnType<ExportLogsService['record']>> | undefined;

    await assert.doesNotReject(async () => {
      result = await service.record({
        userId: 'user-1',
        exportType: ExportType.COMPETENCY_EXCEL,
        fileUrl: '/api/exports/files/competency.xlsx',
      });
    });

    assert.equal(result, null);
    assert.equal(warnMessages.length, 1);
    assert.match(
      String(warnMessages[0]),
      /Failed to write export log COMPETENCY_EXCEL: database unavailable/,
    );
  });
});
