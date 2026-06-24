import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { access } from 'fs/promises';
import { constants } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentAccessPolicyService } from '../student-access/student-access-policy.service';
import {
  LEGACY_PROFILE_UPLOADS_URL_PREFIX,
  PROFILE_UPLOAD_DIR,
  PROFILE_UPLOADS_URL_PREFIX,
} from './file-upload.options';

type PrivateUploadFile = {
  filePath: string;
  filename: string;
  contentType: string;
};

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

@Injectable()
export class PrivateUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessPolicy: StudentAccessPolicyService,
  ) {}

  async getProfileUploadForUser(
    user: AuthenticatedUser,
    filename: string,
  ): Promise<PrivateUploadFile> {
    const safeFilename = this.normalizeProfileUploadFilename(filename);
    const fileUrls = this.buildProfileFileUrlCandidates(safeFilename);
    const evidence = await this.prisma.evidence.findFirst({
      where: { fileUrl: { in: fileUrls } },
      select: { id: true, studentId: true },
    });

    if (evidence) {
      await this.studentAccessPolicy.assertCanAccessStudent(
        user,
        evidence.studentId,
        'You do not have permission to access this evidence file',
      );
      return this.getProfileUploadFile(safeFilename);
    }

    const student = await this.prisma.student.findFirst({
      where: { avatarUrl: { in: fileUrls } },
      select: { id: true },
    });
    if (student) {
      await this.studentAccessPolicy.assertCanAccessStudent(
        user,
        student.id,
        'You do not have permission to access this profile file',
      );
      return this.getProfileUploadFile(safeFilename);
    }

    throw new NotFoundException('Uploaded file not found');
  }

  normalizeProfileUploadFilename(filename: string) {
    const safeFilename = basename(filename);

    if (
      !safeFilename ||
      safeFilename !== filename ||
      safeFilename.includes('..') ||
      safeFilename.includes('\0') ||
      /[/\\]/.test(safeFilename)
    ) {
      throw new BadRequestException('Invalid upload path');
    }

    return safeFilename;
  }

  private async getProfileUploadFile(filename: string): Promise<PrivateUploadFile> {
    const root = resolve(PROFILE_UPLOAD_DIR);
    const filePath = resolve(join(root, filename));

    if (filePath !== join(root, basename(filename)) || !filePath.startsWith(`${root}${sep}`)) {
      throw new BadRequestException('Invalid upload path');
    }

    try {
      await access(filePath, constants.R_OK);
    } catch {
      throw new NotFoundException('Uploaded file not found');
    }

    return {
      filePath,
      filename,
      contentType:
        CONTENT_TYPES_BY_EXTENSION[extname(filename).toLowerCase()] ??
        'application/octet-stream',
    };
  }

  private buildProfileFileUrlCandidates(filename: string) {
    return [
      `${PROFILE_UPLOADS_URL_PREFIX}/${filename}`,
      `${LEGACY_PROFILE_UPLOADS_URL_PREFIX}/${filename}`,
    ];
  }
}
