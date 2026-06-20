import { Injectable, Logger } from '@nestjs/common';
import { ExportType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RecordExportLogInput {
  userId?: string | null;
  exportType: ExportType;
  fileUrl?: string | null;
}

@Injectable()
export class ExportLogsService {
  private readonly logger = new Logger(ExportLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordExportLogInput) {
    try {
      return await this.prisma.exportLog.create({
        data: {
          userId: input.userId ?? null,
          exportType: input.exportType,
          fileUrl: input.fileUrl ?? null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write export log ${input.exportType}: ${message}`);
      return null;
    }
  }
}
