import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RecordActivityInput {
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | Record<string, unknown> | null;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordActivityInput) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          description: this.normalizeDescription(input.description),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write activity log ${input.action}: ${message}`);
    }
  }

  private normalizeDescription(
    description?: string | Record<string, unknown> | null,
  ) {
    if (!description) {
      return null;
    }

    if (typeof description === 'string') {
      return description;
    }

    return JSON.stringify(description);
  }
}
