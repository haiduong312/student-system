import {
  Body,
  Controller,
  Delete,
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
import { StudentAccessPolicyService } from '../common/student-access/student-access-policy.service';
import { profileFileUploadOptions } from '../common/upload/file-upload.options';
import { EvidenceUploadDto } from './dto/evidence-upload.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { CreateStudentActivityDto, UpdateStudentActivityDto } from './dto/student-activity.dto';
import {
  CreateStudentCertificateDto,
  UpdateStudentCertificateDto,
} from './dto/student-certificate.dto';
import {
  CreateStudentExperienceDto,
  UpdateStudentExperienceDto,
} from './dto/student-experience.dto';
import { StudentResourceQueryDto } from './dto/student-profile-query.dto';
import { CreateStudentProjectDto, UpdateStudentProjectDto } from './dto/student-project.dto';
import { CreateStudentSkillDto, UpdateStudentSkillDto } from './dto/student-skill.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly studentAccessPolicy: StudentAccessPolicyService,
  ) {}

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student profile' })
  @Get('me')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getMyProfile(user.id);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student profile updated' })
  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateMyProfile(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post('me/avatar')
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadAvatar(user.id, file);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/skills')
  listMySkills(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StudentResourceQueryDto,
  ) {
    return this.profilesService.listSkillsForCurrentUser(user.id, query);
  }

  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Student skill created' })
  @Post('me/skills')
  createSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentSkillDto,
  ) {
    return this.profilesService.createSkill(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Patch('me/skills/:id')
  updateSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentSkillDto,
  ) {
    return this.profilesService.updateSkill(user.id, id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/skills/:id')
  getSkill(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.getSkill(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @Delete('me/skills/:id')
  deleteSkill(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.deleteSkill(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @Post('me/skills/:id/evidences')
  uploadSkillEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EvidenceUploadDto,
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadEvidence(user.id, 'skills', id, dto, file);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/projects')
  listMyProjects(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentResourceQueryDto) {
    return this.profilesService.listProjectsForCurrentUser(user.id, query);
  }

  @Roles(UserRole.STUDENT)
  @Post('me/projects')
  createProject(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentProjectDto) {
    return this.profilesService.createProject(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Patch('me/projects/:id')
  updateProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentProjectDto,
  ) {
    return this.profilesService.updateProject(user.id, id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/projects/:id')
  getProject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.getProject(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @Delete('me/projects/:id')
  deleteProject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.deleteProject(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @Post('me/projects/:id/evidences')
  uploadProjectEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EvidenceUploadDto,
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadEvidence(user.id, 'projects', id, dto, file);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/certificates')
  listMyCertificates(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentResourceQueryDto) {
    return this.profilesService.listCertificatesForCurrentUser(user.id, query);
  }

  @Roles(UserRole.STUDENT)
  @Post('me/certificates')
  createCertificate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentCertificateDto,
  ) {
    return this.profilesService.createCertificate(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Patch('me/certificates/:id')
  updateCertificate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentCertificateDto,
  ) {
    return this.profilesService.updateCertificate(user.id, id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/certificates/:id')
  getCertificate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.getCertificate(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @Delete('me/certificates/:id')
  deleteCertificate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.deleteCertificate(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @Post('me/certificates/:id/evidences')
  uploadCertificateEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EvidenceUploadDto,
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadEvidence(user.id, 'certificates', id, dto, file);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/activities')
  listMyActivities(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentResourceQueryDto) {
    return this.profilesService.listActivitiesForCurrentUser(user.id, query);
  }

  @Roles(UserRole.STUDENT)
  @Post('me/activities')
  createActivity(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentActivityDto) {
    return this.profilesService.createActivity(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Patch('me/activities/:id')
  updateActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentActivityDto,
  ) {
    return this.profilesService.updateActivity(user.id, id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/activities/:id')
  getActivity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.getActivity(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @Delete('me/activities/:id')
  deleteActivity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.deleteActivity(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @Post('me/activities/:id/evidences')
  uploadActivityEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EvidenceUploadDto,
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadEvidence(user.id, 'activities', id, dto, file);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/experiences')
  listMyExperiences(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentResourceQueryDto) {
    return this.profilesService.listExperiencesForCurrentUser(user.id, query);
  }

  @Roles(UserRole.STUDENT)
  @Post('me/experiences')
  createExperience(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentExperienceDto,
  ) {
    return this.profilesService.createExperience(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Patch('me/experiences/:id')
  updateExperience(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentExperienceDto,
  ) {
    return this.profilesService.updateExperience(user.id, id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('me/experiences/:id')
  getExperience(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.getExperience(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @Delete('me/experiences/:id')
  deleteExperience(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.profilesService.deleteExperience(user.id, id);
  }

  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file', profileFileUploadOptions))
  @ApiConsumes('multipart/form-data')
  @Post('me/experiences/:id/evidences')
  uploadExperienceEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EvidenceUploadDto,
    @UploadedFile() file: any,
  ) {
    return this.profilesService.uploadEvidence(user.id, 'experiences', id, dto, file);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':studentId')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.profilesService.getProfileByStudentId(studentId);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':studentId/skills')
  async listSkills(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: StudentResourceQueryDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.profilesService.listSkills(studentId, query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':studentId/projects')
  async listProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: StudentResourceQueryDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.profilesService.listProjects(studentId, query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':studentId/certificates')
  async listCertificates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: StudentResourceQueryDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.profilesService.listCertificates(studentId, query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':studentId/activities')
  async listActivities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: StudentResourceQueryDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.profilesService.listActivities(studentId, query);
  }

  @Roles(UserRole.ADMIN, UserRole.LECTURER, UserRole.STUDENT)
  @Get(':studentId/experiences')
  async listExperiences(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: StudentResourceQueryDto,
  ) {
    await this.studentAccessPolicy.assertCanAccessStudent(user, studentId);
    return this.profilesService.listExperiences(studentId, query);
  }
}
