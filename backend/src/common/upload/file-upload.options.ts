import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export const UPLOADS_URL_PREFIX = '/uploads';
export const PROFILE_UPLOADS_URL_PREFIX = '/api/uploads/profiles';
export const LEGACY_PROFILE_UPLOADS_URL_PREFIX = `${UPLOADS_URL_PREFIX}/profiles`;
export const UPLOADS_ROOT_DIR = join(process.cwd(), 'uploads');
export const PROFILE_UPLOAD_DIR = join(UPLOADS_ROOT_DIR, 'profiles');

if (!existsSync(PROFILE_UPLOAD_DIR)) {
  mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
}

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const allowedExtensions = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
]);

export const normalizeUploadedFilename = (filename: string) => {
  let decodedFilename: string;

  try {
    decodedFilename = decodeURIComponent(filename);
  } catch {
    throw new BadRequestException('Invalid uploaded file name');
  }

  const safeFilename = basename(decodedFilename);

  if (
    !safeFilename ||
    safeFilename !== decodedFilename ||
    safeFilename.includes('..') ||
    safeFilename.includes('\0') ||
    /[/\\]/.test(safeFilename)
  ) {
    throw new BadRequestException('Invalid uploaded file name');
  }

  return safeFilename;
};

export const profileFileUploadOptions = {
  storage: diskStorage({
    destination: PROFILE_UPLOAD_DIR,
    filename: (_request, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new BadRequestException(
          'Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG, WEBP',
        ),
        false,
      );
      return;
    }

    if (!allowedExtensions.has(extname(file.originalname).toLowerCase())) {
      callback(
        new BadRequestException(
          'Invalid file extension. Allowed extensions: PDF, DOC, DOCX, JPG, PNG, WEBP',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};

export const buildUploadedFileUrl = (filename: string) => {
  const safeFilename = normalizeUploadedFilename(filename);

  return `${PROFILE_UPLOADS_URL_PREFIX}/${safeFilename}`;
};

export const buildPrivateUploadedFileUrlFromStoredUrl = (
  fileUrl: string | null | undefined,
) => {
  if (!fileUrl) {
    return fileUrl;
  }

  const filename = basename(fileUrl);
  return buildUploadedFileUrl(filename);
};
