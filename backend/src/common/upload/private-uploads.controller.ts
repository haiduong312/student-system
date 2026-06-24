import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { PrivateUploadsService } from './private-uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class PrivateUploadsController {
  constructor(private readonly privateUploadsService: PrivateUploadsService) {}

  @Roles(UserRole.STUDENT, UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Private profile or evidence file stream' })
  @Get('profiles/:filename')
  async getProfileUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const file = await this.privateUploadsService.getProfileUploadForUser(
      user,
      filename,
    );

    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename)}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    createReadStream(file.filePath).pipe(response);
  }
}
