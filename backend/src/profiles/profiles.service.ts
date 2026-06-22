import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogStatus,
  EvidenceEntityType,
  EvidenceStatus,
  Prisma,
} from '@prisma/client';
import { EvidenceVerificationService } from '../common/evidence-verification/evidence-verification.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { buildUploadedFileUrl } from '../common/upload/file-upload.options';
import { PrismaService } from '../prisma/prisma.service';
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

type EvidenceResource = 'skills' | 'projects' | 'certificates' | 'activities' | 'experiences';
type ImportantField = string;
type ProfileMutableData = {
  careerGoalId?: string | null;
  specializationId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
};

const PROFILE_INCLUDE = {
  careerGoal: true,
  specialization: true,
  student: {
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  },
};

const IMPORTANT_FIELDS: Record<EvidenceResource, ImportantField[]> = {
  skills: ['description'],
  projects: [
    'title',
    'description',
    'roleInProject',
    'technologies',
    'githubUrl',
    'demoUrl',
    'startDate',
    'endDate',
  ],
  certificates: [
    'certificateName',
    'issuer',
    'issueDate',
    'expirationDate',
    'credentialId',
    'credentialUrl',
  ],
  activities: ['title', 'organization', 'role', 'description', 'startDate', 'endDate'],
  experiences: ['companyName', 'position', 'description', 'startDate', 'endDate'],
};

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evidenceVerification: EvidenceVerificationService,
  ) {}

  async getMyProfile(userId: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.getProfileByStudentId(studentId);
  }

  async getProfileByStudentId(studentId: string) {
    await this.ensureStudentExists(studentId);
    return this.prisma.studentProfile.upsert({
      where: { studentId },
      create: { studentId, lastUpdatedAt: new Date() },
      update: {},
      include: PROFILE_INCLUDE,
    });
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.updateProfile(studentId, dto);
  }

  async updateProfile(studentId: string, dto: UpdateProfileDto) {
    await this.ensureStudentExists(studentId);
    const data = await this.buildProfileUpdateData(studentId, dto);

    return this.prisma.studentProfile.upsert({
      where: { studentId },
      create: { studentId, ...data, lastUpdatedAt: new Date() },
      update: { ...data, lastUpdatedAt: new Date() },
      include: PROFILE_INCLUDE,
    });
  }

  async uploadAvatar(userId: string, file?: any) {
    if (!file) {
      throw new NotFoundException('Uploaded file not found');
    }

    const studentId = await this.getStudentIdByUserId(userId);
    const avatarUrl = buildUploadedFileUrl(file.filename);

    return this.prisma.student.update({
      where: { id: studentId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true, updatedAt: true },
    });
  }

  async listSkills(studentId: string, query: StudentResourceQueryDto) {
    await this.ensureStudentExists(studentId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentSkillWhereInput = {
      studentId,
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(query.verificationStatus ? { evidenceStatus: query.verificationStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { skill: { name: { contains: query.search, mode: 'insensitive' } } },
              { skill: { description: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const orderBy = this.orderBy(query, ['currentLevel', 'createdAt', 'updatedAt']);
    const [data, total] = await Promise.all([
      this.prisma.studentSkill.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { skill: { include: { category: true } } },
      }),
      this.prisma.studentSkill.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async listSkillsForCurrentUser(userId: string, query: StudentResourceQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.listSkills(studentId, query);
  }

  async createSkill(userId: string, dto: CreateStudentSkillDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureSkillExists(dto.skillId);

    try {
      return await this.prisma.studentSkill.create({
        data: {
          studentId,
          skillId: dto.skillId,
          currentLevel: 0,
          description: dto.description,
        },
        include: { skill: { include: { category: true } } },
      });
    } catch (error) {
      this.handleKnownError(error, 'Skill already exists in student profile');
    }
  }

  async getSkill(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    const skill = await this.prisma.studentSkill.findFirst({
      where: { id, studentId },
      include: { skill: { include: { category: true } } },
    });
    if (!skill) {
      throw new NotFoundException('Student skill not found');
    }

    return skill;
  }

  async updateSkill(userId: string, id: string, dto: UpdateStudentSkillDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const existing = await this.getOwnedSkill(studentId, id);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.resetVerificationOnImportantChange(
          tx,
          'skills',
          id,
          existing,
          dto,
        );

        return tx.studentSkill.update({
          where: { id },
          data: { description: dto.description },
          include: { skill: { include: { category: true } } },
        });
      });
    } catch (error) {
      this.handleKnownError(error, 'Skill already exists in student profile');
    }
  }

  async deleteSkill(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsSkill(studentId, id);
    await this.prisma.$transaction(async (tx) => {
      await this.ensureNoEvidenceBeforeDelete(tx, 'skills', id);
      await tx.studentSkill.delete({ where: { id } });
    });
    return { deleted: true };
  }

  async listProjects(studentId: string, query: StudentResourceQueryDto) {
    await this.ensureStudentExists(studentId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentProjectWhereInput = {
      studentId,
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.projectStatus ? { status: query.projectStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { roleInProject: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = this.orderBy(query, ['title', 'status', 'createdAt', 'updatedAt']);
    const [data, total] = await Promise.all([
      this.prisma.studentProject.findMany({ where, skip, take, orderBy }),
      this.prisma.studentProject.count({ where }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async listProjectsForCurrentUser(userId: string, query: StudentResourceQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.listProjects(studentId, query);
  }

  async createProject(userId: string, dto: CreateStudentProjectDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    this.validateStartEndDates(dto);
    return this.prisma.studentProject.create({ data: { ...dto, studentId } });
  }

  async getProject(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    const project = await this.prisma.studentProject.findFirst({
      where: { id, studentId },
    });
    if (!project) {
      throw new NotFoundException('Student project not found');
    }

    return project;
  }

  async updateProject(userId: string, id: string, dto: UpdateStudentProjectDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const existing = await this.getOwnedProject(studentId, id);
    this.validateStartEndDates(dto, existing);

    return this.prisma.$transaction(async (tx) => {
      await this.resetVerificationOnImportantChange(
        tx,
        'projects',
        id,
        existing,
        dto,
      );

      return tx.studentProject.update({ where: { id }, data: dto });
    });
  }

  async deleteProject(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('projects', studentId, id);
    await this.prisma.$transaction(async (tx) => {
      await this.ensureNoEvidenceBeforeDelete(tx, 'projects', id);
      await tx.studentProject.delete({ where: { id } });
    });
    return { deleted: true };
  }

  async listCertificates(studentId: string, query: StudentResourceQueryDto) {
    await this.ensureStudentExists(studentId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentCertificateWhereInput = {
      studentId,
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { certificateName: { contains: query.search, mode: 'insensitive' } },
              { issuer: { contains: query.search, mode: 'insensitive' } },
              { credentialId: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = this.orderBy(query, ['certificateName', 'issuer', 'issueDate', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.studentCertificate.findMany({ where, skip, take, orderBy }),
      this.prisma.studentCertificate.count({ where }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async listCertificatesForCurrentUser(userId: string, query: StudentResourceQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.listCertificates(studentId, query);
  }

  async createCertificate(userId: string, dto: CreateStudentCertificateDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    this.validateIssueExpirationDates(dto);
    return this.prisma.studentCertificate.create({ data: { ...dto, studentId } });
  }

  async getCertificate(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    const certificate = await this.prisma.studentCertificate.findFirst({
      where: { id, studentId },
    });
    if (!certificate) {
      throw new NotFoundException('Student certificate not found');
    }

    return certificate;
  }

  async updateCertificate(userId: string, id: string, dto: UpdateStudentCertificateDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const existing = await this.getOwnedCertificate(studentId, id);
    this.validateIssueExpirationDates(dto, existing);

    return this.prisma.$transaction(async (tx) => {
      await this.resetVerificationOnImportantChange(
        tx,
        'certificates',
        id,
        existing,
        dto,
      );

      return tx.studentCertificate.update({ where: { id }, data: dto });
    });
  }

  async deleteCertificate(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('certificates', studentId, id);
    await this.prisma.$transaction(async (tx) => {
      await this.ensureNoEvidenceBeforeDelete(tx, 'certificates', id);
      await tx.studentCertificate.delete({ where: { id } });
    });
    return { deleted: true };
  }

  async listActivities(studentId: string, query: StudentResourceQueryDto) {
    await this.ensureStudentExists(studentId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentActivityWhereInput = {
      studentId,
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { organization: { contains: query.search, mode: 'insensitive' } },
              { role: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = this.orderBy(query, ['title', 'organization', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.studentActivity.findMany({ where, skip, take, orderBy }),
      this.prisma.studentActivity.count({ where }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async listActivitiesForCurrentUser(userId: string, query: StudentResourceQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.listActivities(studentId, query);
  }

  async createActivity(userId: string, dto: CreateStudentActivityDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    this.validateStartEndDates(dto);
    return this.prisma.studentActivity.create({ data: { ...dto, studentId } });
  }

  async getActivity(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    const activity = await this.prisma.studentActivity.findFirst({
      where: { id, studentId },
    });
    if (!activity) {
      throw new NotFoundException('Student activity not found');
    }

    return activity;
  }

  async updateActivity(userId: string, id: string, dto: UpdateStudentActivityDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const existing = await this.getOwnedActivity(studentId, id);
    this.validateStartEndDates(dto, existing);

    return this.prisma.$transaction(async (tx) => {
      await this.resetVerificationOnImportantChange(
        tx,
        'activities',
        id,
        existing,
        dto,
      );

      return tx.studentActivity.update({ where: { id }, data: dto });
    });
  }

  async deleteActivity(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('activities', studentId, id);
    await this.prisma.$transaction(async (tx) => {
      await this.ensureNoEvidenceBeforeDelete(tx, 'activities', id);
      await tx.studentActivity.delete({ where: { id } });
    });
    return { deleted: true };
  }

  async listExperiences(studentId: string, query: StudentResourceQueryDto) {
    await this.ensureStudentExists(studentId);
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.StudentExperienceWhereInput = {
      studentId,
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { companyName: { contains: query.search, mode: 'insensitive' } },
              { position: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = this.orderBy(query, ['companyName', 'position', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.studentExperience.findMany({ where, skip, take, orderBy }),
      this.prisma.studentExperience.count({ where }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async listExperiencesForCurrentUser(userId: string, query: StudentResourceQueryDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    return this.listExperiences(studentId, query);
  }

  async createExperience(userId: string, dto: CreateStudentExperienceDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    this.validateStartEndDates(dto);
    return this.prisma.studentExperience.create({ data: { ...dto, studentId } });
  }

  async getExperience(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    const experience = await this.prisma.studentExperience.findFirst({
      where: { id, studentId },
    });
    if (!experience) {
      throw new NotFoundException('Student experience not found');
    }

    return experience;
  }

  async updateExperience(userId: string, id: string, dto: UpdateStudentExperienceDto) {
    const studentId = await this.getStudentIdByUserId(userId);
    const existing = await this.getOwnedExperience(studentId, id);
    this.validateStartEndDates(dto, existing);

    return this.prisma.$transaction(async (tx) => {
      await this.resetVerificationOnImportantChange(
        tx,
        'experiences',
        id,
        existing,
        dto,
      );

      return tx.studentExperience.update({ where: { id }, data: dto });
    });
  }

  async deleteExperience(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('experiences', studentId, id);
    await this.prisma.$transaction(async (tx) => {
      await this.ensureNoEvidenceBeforeDelete(tx, 'experiences', id);
      await tx.studentExperience.delete({ where: { id } });
    });
    return { deleted: true };
  }

  async uploadEvidence(
    userId: string,
    resource: EvidenceResource,
    entityId: string,
    dto: EvidenceUploadDto,
    file?: any,
  ) {
    if (!file && !dto.evidenceUrl) {
      throw new NotFoundException('Uploaded file or evidenceUrl is required');
    }

    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity(resource, studentId, entityId);

    return this.prisma.$transaction(async (tx) => {
      const relatedEntityType = this.toEvidenceEntityType(resource);
      const evidence = await tx.evidence.create({
        data: {
          studentId,
          relatedEntityType,
          relatedEntityId: entityId,
          fileUrl: file ? buildUploadedFileUrl(file.filename) : undefined,
          evidenceUrl: dto.evidenceUrl,
          note: dto.note,
          status: EvidenceStatus.PENDING,
        },
      });

      await this.evidenceVerification.updateResourceVerificationStatusFromEvidence(
        relatedEntityType,
        entityId,
        { client: tx },
      );

      return evidence;
    });
  }

  private async getStudentIdByUserId(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new ForbiddenException('Current user is not a student');
    }

    return student.id;
  }

  private async ensureStudentExists(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async ensureCareerGoalExists(careerGoalId: string) {
    const careerGoal = await this.prisma.careerGoal.findUnique({
      where: { id: careerGoalId },
      select: { id: true, status: true },
    });
    if (!careerGoal) {
      throw new NotFoundException('Career goal not found');
    }
    if (careerGoal.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Career goal is not active');
    }
  }

  private async buildProfileUpdateData(studentId: string, dto: UpdateProfileDto) {
    const existingProfile = await this.prisma.studentProfile.findUnique({
      where: { studentId },
      select: { careerGoalId: true, specializationId: true },
    });
    const careerGoalProvided = this.hasOwn(dto, 'careerGoalId');
    const specializationProvided = this.hasOwn(dto, 'specializationId');
    const nextCareerGoalId = careerGoalProvided
      ? this.normalizeOptionalId(dto.careerGoalId, 'Career goal is required')
      : existingProfile?.careerGoalId ?? null;
    const data: ProfileMutableData = {};

    if (nextCareerGoalId) {
      await this.ensureCareerGoalExists(nextCareerGoalId);
    }

    if (careerGoalProvided) {
      data.careerGoalId = nextCareerGoalId;
    }

    if (specializationProvided) {
      data.specializationId = await this.resolveRequestedSpecializationId(
        dto.specializationId,
        nextCareerGoalId,
      );
    } else if (careerGoalProvided) {
      data.specializationId = await this.resolveExistingSpecializationAfterCareerGoalChange(
        existingProfile?.specializationId ?? null,
        nextCareerGoalId,
      );
    }

    this.copyProfileField(data, dto, 'summary');
    this.copyProfileField(data, dto, 'githubUrl');
    this.copyProfileField(data, dto, 'linkedinUrl');
    this.copyProfileField(data, dto, 'portfolioUrl');

    return data;
  }

  private async resolveRequestedSpecializationId(
    specializationId: string | null | undefined,
    careerGoalId: string | null,
  ) {
    const normalizedSpecializationId = this.normalizeOptionalId(
      specializationId,
      'Specialization is required',
    );
    if (!normalizedSpecializationId) {
      return null;
    }
    if (!careerGoalId) {
      throw new BadRequestException('Select a career goal before selecting a specialization');
    }

    await this.ensureSpecializationBelongsToCareerGoal(
      normalizedSpecializationId,
      careerGoalId,
    );
    return normalizedSpecializationId;
  }

  private async resolveExistingSpecializationAfterCareerGoalChange(
    currentSpecializationId: string | null,
    nextCareerGoalId: string | null,
  ) {
    if (!currentSpecializationId || !nextCareerGoalId) {
      return null;
    }

    const stillValid = await this.isSpecializationValidForCareerGoal(
      currentSpecializationId,
      nextCareerGoalId,
    );
    return stillValid ? currentSpecializationId : null;
  }

  private async ensureSpecializationBelongsToCareerGoal(
    specializationId: string,
    careerGoalId: string,
  ) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id: specializationId },
      select: { id: true, careerGoalId: true, status: true },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }
    if (specialization.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Specialization is not active');
    }
    if (specialization.careerGoalId !== careerGoalId) {
      throw new BadRequestException(
        'Selected specialization does not belong to the selected career goal',
      );
    }
  }

  private async isSpecializationValidForCareerGoal(
    specializationId: string,
    careerGoalId: string,
  ) {
    const specialization = await this.prisma.specialization.findFirst({
      where: {
        id: specializationId,
        careerGoalId,
        status: CatalogStatus.ACTIVE,
      },
      select: { id: true },
    });

    return Boolean(specialization);
  }

  private normalizeOptionalId(value: string | null | undefined, message: string) {
    if (value === undefined || value === null) {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private copyProfileField(
    data: ProfileMutableData,
    dto: UpdateProfileDto,
    field: 'summary' | 'githubUrl' | 'linkedinUrl' | 'portfolioUrl',
  ) {
    if (this.hasOwn(dto, field)) {
      data[field] = dto[field];
    }
  }

  private hasOwn<T extends object>(value: T, key: keyof T) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  private async ensureSkillExists(skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { id: true, status: true },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    if (skill.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Skill is not active');
    }
  }

  private async ensureOwnsSkill(studentId: string, id: string) {
    const entity = await this.getOwnedSkill(studentId, id);
    if (!entity) {
      throw new NotFoundException('Student skill not found');
    }
  }

  private async ensureOwnsEntity(resource: EvidenceResource, studentId: string, id: string) {
    const entity = await this.findOwnedEntity(resource, studentId, id);
    if (!entity) {
      throw new NotFoundException('Profile resource not found');
    }
  }

  private findOwnedEntity(resource: EvidenceResource, studentId: string, id: string) {
    const where = { id, studentId };
    switch (resource) {
      case 'skills':
        return this.prisma.studentSkill.findFirst({ where, select: { id: true } });
      case 'projects':
        return this.prisma.studentProject.findFirst({ where, select: { id: true } });
      case 'certificates':
        return this.prisma.studentCertificate.findFirst({ where, select: { id: true } });
      case 'activities':
        return this.prisma.studentActivity.findFirst({ where, select: { id: true } });
      case 'experiences':
        return this.prisma.studentExperience.findFirst({ where, select: { id: true } });
    }
  }

  private async getOwnedSkill(studentId: string, id: string) {
    const skill = await this.prisma.studentSkill.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        description: true,
        evidenceStatus: true,
      },
    });
    if (!skill) {
      throw new NotFoundException('Student skill not found');
    }

    return skill;
  }

  private async getOwnedProject(studentId: string, id: string) {
    const project = await this.prisma.studentProject.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        title: true,
        description: true,
        roleInProject: true,
        technologies: true,
        githubUrl: true,
        demoUrl: true,
        startDate: true,
        endDate: true,
        verificationStatus: true,
      },
    });
    if (!project) {
      throw new NotFoundException('Student project not found');
    }

    return project;
  }

  private async getOwnedCertificate(studentId: string, id: string) {
    const certificate = await this.prisma.studentCertificate.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        certificateName: true,
        issuer: true,
        issueDate: true,
        expirationDate: true,
        credentialId: true,
        credentialUrl: true,
        verificationStatus: true,
      },
    });
    if (!certificate) {
      throw new NotFoundException('Student certificate not found');
    }

    return certificate;
  }

  private async getOwnedActivity(studentId: string, id: string) {
    const activity = await this.prisma.studentActivity.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        title: true,
        organization: true,
        role: true,
        description: true,
        startDate: true,
        endDate: true,
        verificationStatus: true,
      },
    });
    if (!activity) {
      throw new NotFoundException('Student activity not found');
    }

    return activity;
  }

  private async getOwnedExperience(studentId: string, id: string) {
    const experience = await this.prisma.studentExperience.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        companyName: true,
        position: true,
        description: true,
        startDate: true,
        endDate: true,
        verificationStatus: true,
      },
    });
    if (!experience) {
      throw new NotFoundException('Student experience not found');
    }

    return experience;
  }

  private async resetVerificationOnImportantChange(
    tx: Prisma.TransactionClient,
    resource: EvidenceResource,
    id: string,
    oldData: object,
    newData: object,
  ) {
    if (!this.hasImportantFieldChanged(resource, oldData, newData)) {
      return false;
    }

    const entityType = this.toEvidenceEntityType(resource);
    const evidenceCount = await tx.evidence.count({
      where: {
        relatedEntityType: entityType,
        relatedEntityId: id,
      },
    });

    if (evidenceCount > 0) {
      await tx.evidence.updateMany({
        where: {
          relatedEntityType: entityType,
          relatedEntityId: id,
        },
        data: {
          status: EvidenceStatus.PENDING,
          reviewedById: null,
          reviewedAt: null,
          reviewerNote: null,
        },
      });
    }

    await this.evidenceVerification.updateResourceVerificationStatusFromEvidence(
      entityType,
      id,
      { client: tx },
    );

    return true;
  }

  private hasImportantFieldChanged(
    resource: EvidenceResource,
    oldData: object,
    newData: object,
  ) {
    return IMPORTANT_FIELDS[resource].some((field) => {
      if (!Object.prototype.hasOwnProperty.call(newData, field)) {
        return false;
      }

      return (
        this.normalizeComparableValue(field, this.getObjectField(oldData, field)) !==
        this.normalizeComparableValue(field, this.getObjectField(newData, field))
      );
    });
  }

  private getObjectField(value: object, field: string) {
    return (value as Record<string, unknown>)[field];
  }

  private normalizeComparableValue(field: string, value: unknown) {
    if (value instanceof Date) {
      return this.isDateField(field) ? this.toDateKey(value) : value.toISOString();
    }
    if (this.isDateField(field) && typeof value === 'string') {
      return this.toDateKey(value);
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }

    return value;
  }

  private async ensureNoEvidenceBeforeDelete(
    tx: Prisma.TransactionClient,
    resource: EvidenceResource,
    id: string,
  ) {
    const evidenceCount = await tx.evidence.count({
      where: {
        relatedEntityType: this.toEvidenceEntityType(resource),
        relatedEntityId: id,
      },
    });
    if (evidenceCount > 0) {
      throw new BadRequestException(
        'Cannot delete this profile resource because it already has evidence. Archive/soft delete requires a schema migration.',
      );
    }
  }

  private validateStartEndDates(
    dto: {
      startDate?: string | null;
      endDate?: string | null;
    },
    existing?: {
      startDate: Date | null;
      endDate: Date | null;
    },
  ) {
    const startDate = this.hasOwn(dto, 'startDate') ? dto.startDate : existing?.startDate;
    const endDate = this.hasOwn(dto, 'endDate') ? dto.endDate : existing?.endDate;

    this.validateDateOrder(
      startDate,
      endDate,
      'endDate must be greater than or equal to startDate',
    );
  }

  private validateIssueExpirationDates(
    dto: {
      issueDate?: string | null;
      expirationDate?: string | null;
    },
    existing?: {
      issueDate: Date | null;
      expirationDate: Date | null;
    },
  ) {
    const issueDate = this.hasOwn(dto, 'issueDate') ? dto.issueDate : existing?.issueDate;
    const expirationDate = this.hasOwn(dto, 'expirationDate')
      ? dto.expirationDate
      : existing?.expirationDate;

    this.validateDateOrder(
      issueDate,
      expirationDate,
      'expirationDate must be greater than or equal to issueDate',
    );
  }

  private validateDateOrder(
    start: string | Date | null | undefined,
    end: string | Date | null | undefined,
    message: string,
  ) {
    if (!start || !end) {
      return;
    }

    if (this.toDateTime(end) < this.toDateTime(start)) {
      throw new BadRequestException(message);
    }
  }

  private toDateTime(value: string | Date) {
    if (value instanceof Date) {
      return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    }

    const date = new Date(value);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  private toDateKey(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  }

  private isDateField(field: string) {
    return ['startDate', 'endDate', 'issueDate', 'expirationDate'].includes(field);
  }

  private toEvidenceEntityType(resource: EvidenceResource) {
    const map: Record<EvidenceResource, EvidenceEntityType> = {
      skills: EvidenceEntityType.SKILL,
      projects: EvidenceEntityType.PROJECT,
      certificates: EvidenceEntityType.CERTIFICATE,
      activities: EvidenceEntityType.ACTIVITY,
      experiences: EvidenceEntityType.EXPERIENCE,
    };

    return map[resource];
  }

  private orderBy(query: StudentResourceQueryDto, allowedFields: string[]) {
    const sortBy = allowedFields.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    return { [sortBy]: query.sortOrder };
  }

  private handleKnownError(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(message);
      }
    }

    throw error;
  }
}
