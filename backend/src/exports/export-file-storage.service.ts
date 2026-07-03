import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { constants } from 'fs';
import { access, mkdir, writeFile } from 'fs/promises';
import { basename, extname, join, resolve, sep } from 'path';

const MIME_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

interface SaveExportFileInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  ownerId?: string;
}

interface SavedExportFile {
  fileUrl: string;
  filePath: string;
  fileName: string;
}

interface ReadableExportFile {
  filePath: string;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class ExportFileStorageService {
  private readonly storageRoot: string;
  private readonly fileUrlPrefix: string;

  constructor(configService: ConfigService) {
    const configuredStorageRoot = configService.get<string>('EXPORT_STORAGE_DIR')?.trim();
    const configuredFileUrlPrefix = configService
      .get<string>('EXPORT_FILE_URL_PREFIX')
      ?.trim();

    this.storageRoot = resolve(
      configuredStorageRoot || join(process.cwd(), 'storage', 'exports'),
    );
    this.fileUrlPrefix = (configuredFileUrlPrefix || '/api/exports/files').replace(
      /\/+$/,
      '',
    );
  }

  async saveExportFile(input: SaveExportFileInput): Promise<SavedExportFile> {
    if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new BadRequestException('Export file buffer must not be empty');
    }

    const extension = MIME_TYPE_EXTENSIONS[input.mimeType];
    if (!extension) {
      throw new BadRequestException('Unsupported export file MIME type');
    }

    const ownerStorageRoot = this.getOwnerStorageRoot(input.ownerId);
    const fileName = this.buildSafeFileName(input.fileName, extension);
    const filePath = resolve(join(ownerStorageRoot, fileName));
    if (!filePath.startsWith(`${ownerStorageRoot}${sep}`)) {
      throw new BadRequestException('Invalid export file path');
    }

    await mkdir(ownerStorageRoot, { recursive: true });
    await writeFile(filePath, input.buffer, { flag: 'wx' });

    return {
      fileUrl: `${this.fileUrlPrefix}/${encodeURIComponent(fileName)}`,
      filePath,
      fileName,
    };
  }

  async getExportFile(
    fileName: string,
    ownerId?: string,
  ): Promise<ReadableExportFile> {
    const safeFileName = basename(fileName);
    if (
      !safeFileName ||
      safeFileName !== fileName ||
      safeFileName.includes('..') ||
      /[/\\]/.test(safeFileName)
    ) {
      throw new BadRequestException('Invalid export file name');
    }

    const extension = extname(safeFileName).toLowerCase();
    const mimeType = Object.entries(MIME_TYPE_EXTENSIONS).find(
      ([, allowedExtension]) => allowedExtension === extension,
    )?.[0];
    if (!mimeType) {
      throw new BadRequestException('Unsupported export file extension');
    }

    const ownerStorageRoot = this.getOwnerStorageRoot(ownerId);
    const filePath = resolve(join(ownerStorageRoot, safeFileName));
    if (!filePath.startsWith(`${ownerStorageRoot}${sep}`)) {
      throw new BadRequestException('Invalid export file path');
    }

    try {
      await access(filePath, constants.R_OK);
    } catch {
      throw new NotFoundException('Export file not found');
    }

    return { filePath, fileName: safeFileName, mimeType };
  }

  private buildSafeFileName(requestedFileName: string, extension: string) {
    const normalizedRequestedFileName = requestedFileName?.trim() || 'export';
    const originalBaseName = basename(
      normalizedRequestedFileName,
      extname(normalizedRequestedFileName),
    );
    const safeBaseName =
      originalBaseName
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'export';

    return `${safeBaseName}-${Date.now()}-${randomUUID()}${extension}`;
  }

  private getOwnerStorageRoot(ownerId?: string): string {
    if (ownerId === undefined) {
      return this.storageRoot;
    }
    if (!ownerId.trim()) {
      throw new BadRequestException('Export file owner must not be empty');
    }

    const ownerDirectory = createHash('sha256').update(ownerId).digest('hex');
    return resolve(join(this.storageRoot, ownerDirectory));
  }
}
