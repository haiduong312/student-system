import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'path';
import { AppModule } from '../../app.module';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  buildUploadedFileUrl,
  PROFILE_UPLOAD_DIR,
  profileFileUploadOptions,
} from './file-upload.options';
import { PrivateUploadsController } from './private-uploads.controller';
import { PrivateUploadsService } from './private-uploads.service';

const user = (role: UserRole, id = `${role.toLowerCase()}-1`): AuthenticatedUser => ({
  id,
  email: `${id}@example.edu`,
  fullName: id,
  role,
});

async function withProfileUploadFile<T>(
  filename: string,
  callback: () => Promise<T>,
) {
  await mkdir(PROFILE_UPLOAD_DIR, { recursive: true });
  const filePath = join(PROFILE_UPLOAD_DIR, filename);
  await writeFile(filePath, 'private file fixture');

  try {
    return await callback();
  } finally {
    await unlink(filePath).catch(() => undefined);
  }
}

function createPrivateUploadsService(input: {
  filename?: string;
  evidenceStudentId?: string;
  avatarStudentId?: string;
  canAccess?: (user: AuthenticatedUser, studentId: string) => boolean;
}) {
  const filename = input.filename ?? 'proof.pdf';
  const fileUrls = [
    `/api/uploads/profiles/${filename}`,
    `/uploads/profiles/${filename}`,
  ];
  return new PrivateUploadsService(
    {
      evidence: {
        findFirst: async (args: any) =>
          input.evidenceStudentId &&
          args.where.fileUrl.in.some((fileUrl: string) => fileUrls.includes(fileUrl))
            ? { id: 'evidence-1', studentId: input.evidenceStudentId }
            : null,
      },
      student: {
        findFirst: async (args: any) =>
          input.avatarStudentId &&
          args.where.avatarUrl.in.some((fileUrl: string) => fileUrls.includes(fileUrl))
            ? { id: input.avatarStudentId }
            : null,
      },
    } as any,
    {
      assertCanAccessStudent: async (
        currentUser: AuthenticatedUser,
        studentId: string,
        message: string,
      ) => {
        if (input.canAccess?.(currentUser, studentId)) {
          return;
        }
        throw new ForbiddenException(message);
      },
    } as any,
  );
}

const runFileFilter = (file: { mimetype: string; originalname: string }) =>
  new Promise<{ error: Error | null; accepted: boolean | undefined }>((resolve) => {
    (profileFileUploadOptions.fileFilter as any)(
      {},
      file,
      (error: Error | null, accepted: boolean | undefined) =>
        resolve({ error, accepted }),
    );
  });

describe('PrivateUploadsService access control', () => {
  it('keeps profile uploads behind the JWT guard and does not register public static uploads', () => {
    const imports = Reflect.getMetadata('imports', AppModule) ?? [];
    const providers = Reflect.getMetadata('providers', AppModule) ?? [];
    const handler = PrivateUploadsController.prototype.getProfileUpload;

    assert.equal(
      imports.some((item: any) =>
        String(item?.module?.name ?? item?.name ?? '').includes('ServeStatic'),
      ),
      false,
    );
    assert.equal(Reflect.getMetadata(IS_PUBLIC_KEY, handler), undefined);
    assert.deepEqual(Reflect.getMetadata(ROLES_KEY, handler), [
      UserRole.STUDENT,
      UserRole.LECTURER,
      UserRole.ADMIN,
    ]);
    assert.equal(
      providers.some(
        (provider: any) =>
          provider.provide === APP_GUARD && provider.useClass === JwtAuthGuard,
      ),
      true,
    );
  });

  it('rejects unauthenticated private upload requests through the JWT guard', () => {
    const guard = new JwtAuthGuard({
      getAllAndOverride: () => false,
    } as any);

    assert.throws(
      () => (guard as any).handleRequest(null, null, null),
      UnauthorizedException,
    );
  });

  it('allows the owner to access their private evidence file', async () => {
    const filename = `owner-${process.pid}-${Date.now()}.pdf`;
    const service = createPrivateUploadsService({
      filename,
      evidenceStudentId: 'student-1',
      canAccess: (currentUser, studentId) =>
        currentUser.role === UserRole.STUDENT && studentId === 'student-1',
    });

    await withProfileUploadFile(filename, async () => {
      const file = await service.getProfileUploadForUser(
        user(UserRole.STUDENT),
        filename,
      );

      assert.equal(file.filename, filename);
      assert.equal(file.contentType, 'application/pdf');
      assert.equal(file.filePath.endsWith(filename), true);
    });
  });

  it('allows admin and assigned reviewer access through the student access policy', async () => {
    const filename = `reviewer-${process.pid}-${Date.now()}.png`;
    const service = createPrivateUploadsService({
      filename,
      evidenceStudentId: 'student-1',
      canAccess: (currentUser) =>
        currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.LECTURER,
    });

    await withProfileUploadFile(filename, async () => {
      const adminFile = await service.getProfileUploadForUser(
        user(UserRole.ADMIN),
        filename,
      );
      const reviewerFile = await service.getProfileUploadForUser(
        user(UserRole.LECTURER),
        filename,
      );

      assert.equal(adminFile.contentType, 'image/png');
      assert.equal(reviewerFile.contentType, 'image/png');
    });
  });

  it('rejects logged-in users who do not own or review the private file', async () => {
    const service = createPrivateUploadsService({
      evidenceStudentId: 'student-2',
      canAccess: () => false,
    });

    await assert.rejects(
      () =>
        service.getProfileUploadForUser(user(UserRole.STUDENT), 'proof.pdf'),
      ForbiddenException,
    );
  });

  it('rejects raw, encoded, and nested path traversal attempts', async () => {
    const service = createPrivateUploadsService({
      canAccess: () => true,
    });
    const traversalInputs = [
      '../secret.pdf',
      '..%2fsecret.pdf',
      '%2e%2e%2fsecret.pdf',
      '%2e%2e.pdf',
      'nested/secret.pdf',
      'nested\\secret.pdf',
    ];

    for (const filename of traversalInputs) {
      await assert.rejects(
        () => service.getProfileUploadForUser(user(UserRole.ADMIN), filename),
        BadRequestException,
      );
    }
  });
});

describe('profile upload URL and file validation', () => {
  it('builds private API upload URLs without exposing the server physical path', () => {
    const url = buildUploadedFileUrl('proof.pdf');

    assert.equal(url, '/api/uploads/profiles/proof.pdf');
    assert.equal(url.startsWith('/uploads/'), false);
    assert.equal(url.includes(PROFILE_UPLOAD_DIR), false);
  });

  it('rejects encoded path traversal while building upload URLs', () => {
    assert.throws(
      () => buildUploadedFileUrl('%2e%2e%2fsecret.pdf'),
      BadRequestException,
    );
  });

  it('validates upload file size, MIME type, and extension', async () => {
    assert.equal(profileFileUploadOptions.limits.fileSize, 10 * 1024 * 1024);

    const invalidMime = await runFileFilter({
      mimetype: 'text/plain',
      originalname: 'proof.pdf',
    });
    assert.ok(invalidMime.error instanceof BadRequestException);
    assert.equal(invalidMime.accepted, false);

    const invalidExtension = await runFileFilter({
      mimetype: 'application/pdf',
      originalname: 'proof.exe',
    });
    assert.ok(invalidExtension.error instanceof BadRequestException);
    assert.equal(invalidExtension.accepted, false);

    const validFile = await runFileFilter({
      mimetype: 'application/pdf',
      originalname: 'proof.pdf',
    });
    assert.equal(validFile.error, null);
    assert.equal(validFile.accepted, true);
  });
});
