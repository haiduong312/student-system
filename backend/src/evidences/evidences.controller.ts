import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { profileFileUploadOptions } from '../common/upload/file-upload.options';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { EvidenceQueryDto } from './dto/evidence-query.dto';
import { RejectEvidenceDto } from './dto/reject-evidence.dto';
import { EvidencesService } from './evidences.service';

@ApiTags('evidences')
@ApiBearerAuth()
@Controller('evidences')
export class EvidencesController {
  constructor(private readonly evidencesService: EvidencesService) {}

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['relatedEntityType', 'relatedEntityId'],
      properties: {
        relatedEntityType: {
          type: 'string',
          enum: ['SKILL', 'PROJECT', 'CERTIFICATE', 'ACTIVITY', 'EXPERIENCE', 'ROADMAP_ITEM'],
        },
        relatedEntityId: { type: 'string' },
        evidenceUrl: { type: 'string' },
        note: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Evidence uploaded and marked as PENDING' })
  @Post()
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEvidenceDto,
    @UploadedFile() file: any,
  ) {
    return this.evidencesService.upload(user.id, dto, file);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student evidences' })
  @Get('me')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EvidenceQueryDto,
  ) {
    return this.evidencesService.findMine(user.id, query);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Pending evidence queue' })
  @Get('pending')
  findPending(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EvidenceQueryDto,
  ) {
    return this.evidencesService.findPending(user, query);
  }

  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ description: 'All evidences for admin' })
  @Get()
  findAll(@Query() query: EvidenceQueryDto) {
    return this.evidencesService.findAll(query);
  }

  @Roles(UserRole.STUDENT, UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Evidence detail and status' })
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.evidencesService.findOne(user, id);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Evidence verified' })
  @Patch(':id/verify')
  verify(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.evidencesService.verify(user, id);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Evidence rejected' })
  @Patch(':id/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectEvidenceDto,
  ) {
    return this.evidencesService.reject(user, id, dto);
  }
}
