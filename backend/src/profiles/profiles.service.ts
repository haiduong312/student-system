import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvidenceEntityType, EvidenceStatus, Prisma, VerificationStatus } from '@prisma/client';
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

const PROFILE_INCLUDE = {
  careerGoal: true,
  student: {
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true, status: true },
      },
    },
  },
};

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (dto.careerGoalId) {
      await this.ensureCareerGoalExists(dto.careerGoalId);
    }

    return this.prisma.studentProfile.upsert({
      where: { studentId },
      create: { studentId, ...dto, lastUpdatedAt: new Date() },
      update: { ...dto, lastUpdatedAt: new Date() },
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
        data: { ...dto, studentId },
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
    await this.ensureOwnsSkill(studentId, id);
    if (dto.skillId) {
      await this.ensureSkillExists(dto.skillId);
    }

    try {
      return await this.prisma.studentSkill.update({
        where: { id },
        data: dto,
        include: { skill: { include: { category: true } } },
      });
    } catch (error) {
      this.handleKnownError(error, 'Skill already exists in student profile');
    }
  }

  async deleteSkill(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsSkill(studentId, id);
    await this.prisma.studentSkill.delete({ where: { id } });
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
    await this.ensureOwnsEntity('projects', studentId, id);
    return this.prisma.studentProject.update({ where: { id }, data: dto });
  }

  async deleteProject(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('projects', studentId, id);
    await this.prisma.studentProject.delete({ where: { id } });
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
    await this.ensureOwnsEntity('certificates', studentId, id);
    return this.prisma.studentCertificate.update({ where: { id }, data: dto });
  }

  async deleteCertificate(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('certificates', studentId, id);
    await this.prisma.studentCertificate.delete({ where: { id } });
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
    await this.ensureOwnsEntity('activities', studentId, id);
    return this.prisma.studentActivity.update({ where: { id }, data: dto });
  }

  async deleteActivity(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('activities', studentId, id);
    await this.prisma.studentActivity.delete({ where: { id } });
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
    await this.ensureOwnsEntity('experiences', studentId, id);
    return this.prisma.studentExperience.update({ where: { id }, data: dto });
  }

  async deleteExperience(userId: string, id: string) {
    const studentId = await this.getStudentIdByUserId(userId);
    await this.ensureOwnsEntity('experiences', studentId, id);
    await this.prisma.studentExperience.delete({ where: { id } });
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

    const evidence = await this.prisma.evidence.create({
      data: {
        studentId,
        relatedEntityType: this.toEvidenceEntityType(resource),
        relatedEntityId: entityId,
        fileUrl: file ? buildUploadedFileUrl(file.filename) : undefined,
        evidenceUrl: dto.evidenceUrl,
        note: dto.note,
        status: EvidenceStatus.PENDING,
      },
    });

    await this.markEvidencePending(resource, entityId);
    return evidence;
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
      select: { id: true },
    });
    if (!careerGoal) {
      throw new NotFoundException('Career goal not found');
    }
  }

  private async ensureSkillExists(skillId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { id: true },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
  }

  private async ensureOwnsSkill(studentId: string, id: string) {
    const entity = await this.prisma.studentSkill.findFirst({
      where: { id, studentId },
      select: { id: true },
    });
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

  private markEvidencePending(resource: EvidenceResource, id: string) {
    switch (resource) {
      case 'skills':
        return this.prisma.studentSkill.update({
          where: { id },
          data: { evidenceStatus: VerificationStatus.PENDING },
        });
      case 'projects':
        return this.prisma.studentProject.update({
          where: { id },
          data: { verificationStatus: VerificationStatus.PENDING },
        });
      case 'certificates':
        return this.prisma.studentCertificate.update({
          where: { id },
          data: { verificationStatus: VerificationStatus.PENDING },
        });
      case 'activities':
        return this.prisma.studentActivity.update({
          where: { id },
          data: { verificationStatus: VerificationStatus.PENDING },
        });
      case 'experiences':
        return this.prisma.studentExperience.update({
          where: { id },
          data: { verificationStatus: VerificationStatus.PENDING },
        });
    }
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
