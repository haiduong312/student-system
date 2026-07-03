import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, sep } from 'path';
import { ExportFileStorageService } from './export-file-storage.service';

describe('ExportFileStorageService', () => {
  let storageRoot: string;
  let service: ExportFileStorageService;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'student-system-exports-'));
    const values: Record<string, string> = {
      EXPORT_STORAGE_DIR: storageRoot,
      EXPORT_FILE_URL_PREFIX: '/api/exports/files',
    };
    const configService = {
      get: (key: string) => values[key],
    } as ConfigService;

    service = new ExportFileStorageService(configService);
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  it('stores a PDF with a server-generated unique file name', async () => {
    const saved = await service.saveExportFile({
      buffer: Buffer.from('pdf-content'),
      fileName: 'student-portfolio.pdf',
      mimeType: 'application/pdf',
    });

    assert.match(saved.fileName, /^student-portfolio-\d+-[0-9a-f-]+\.pdf$/);
    assert.equal(saved.fileUrl, `/api/exports/files/${saved.fileName}`);
    assert.equal(dirname(saved.filePath), storageRoot);
    assert.equal((await readFile(saved.filePath)).toString(), 'pdf-content');

    const readable = await service.getExportFile(saved.fileName);
    assert.deepEqual(readable, {
      filePath: saved.filePath,
      fileName: saved.fileName,
      mimeType: 'application/pdf',
    });
  });

  it('does not allow a requested file name to escape the export directory', async () => {
    const saved = await service.saveExportFile({
      buffer: Buffer.from('xlsx-content'),
      fileName: '../../sensitive-report.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    assert.equal(dirname(saved.filePath), storageRoot);
    assert.equal(saved.filePath.startsWith(`${storageRoot}${sep}`), true);
    assert.equal(saved.fileName.includes('..'), false);
    assert.match(saved.fileName, /^sensitive-report-\d+-[0-9a-f-]+\.xlsx$/);
  });

  it('isolates stored files by authenticated owner', async () => {
    const saved = await service.saveExportFile({
      buffer: Buffer.from('owned-xlsx-content'),
      fileName: 'assigned-students.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ownerId: 'lecturer-user-1',
    });

    assert.notEqual(dirname(saved.filePath), storageRoot);
    const readable = await service.getExportFile(saved.fileName, 'lecturer-user-1');
    assert.equal(readable.filePath, saved.filePath);
    await assert.rejects(
      service.getExportFile(saved.fileName, 'lecturer-user-2'),
      NotFoundException,
    );
  });

  it('rejects unsupported MIME types and empty buffers', async () => {
    await assert.rejects(
      service.saveExportFile({
        buffer: Buffer.from('content'),
        fileName: 'report.csv',
        mimeType: 'text/csv',
      }),
      BadRequestException,
    );

    await assert.rejects(
      service.saveExportFile({
        buffer: Buffer.alloc(0),
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
      }),
      BadRequestException,
    );
  });

  it('rejects traversal attempts when reading an export file', async () => {
    await assert.rejects(service.getExportFile('../report.xlsx'), BadRequestException);
    await assert.rejects(service.getExportFile('nested/report.xlsx'), BadRequestException);
  });
});
