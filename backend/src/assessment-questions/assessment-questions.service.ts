import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuestionStatus, QuestionType } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  buildPaginatedResult,
  getPagination,
} from '../common/pagination/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentQuestionQueryDto } from './dto/assessment-question-query.dto';
import {
  CreateAssessmentOptionDto,
  CreateAssessmentQuestionDto,
} from './dto/create-assessment-question.dto';
import { UpdateAssessmentQuestionDto } from './dto/update-assessment-question.dto';

const SORTABLE_FIELDS = new Set([
  'level',
  'questionType',
  'status',
  'createdAt',
  'updatedAt',
]);
const VERSIONED_QUESTION_FIELDS = [
  'skillId',
  'questionText',
  'questionType',
  'level',
  'explanation',
  'options',
] as const;

@Injectable()
export class AssessmentQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateAssessmentQuestionDto, actorUserId?: string) {
    this.validateOptions(dto.questionType, dto.options);

    try {
      const question = await this.prisma.$transaction(async (tx) => {
        await this.ensureSkillExists(tx, dto.skillId);

        return tx.assessmentQuestion.create({
          data: {
            skillId: dto.skillId,
            questionText: dto.questionText,
            questionType: dto.questionType,
            level: dto.level,
            explanation: dto.explanation,
            status: dto.status,
            options: {
              create: this.toOptionCreateManyInput(dto.options),
            },
          },
          include: this.detailInclude(),
        });
      });
      await this.activityLogs.record({
        actorUserId,
        action: 'ASSESSMENT_QUESTION_CREATED',
        entityType: 'AssessmentQuestion',
        entityId: question.id,
        description: {
          skillId: question.skillId,
          questionType: question.questionType,
          status: question.status,
        },
      });

      return question;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findAll(query: AssessmentQuestionQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.AssessmentQuestionWhereInput = {
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(query.skillType ? { skill: { type: query.skillType } } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.questionType ? { questionType: query.questionType } : {}),
      ...(query.search
        ? {
            OR: [
              { questionText: { contains: query.search, mode: 'insensitive' } },
              { explanation: { contains: query.search, mode: 'insensitive' } },
              { skill: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const sortBy = SORTABLE_FIELDS.has(query.sortBy ?? '')
      ? query.sortBy!
      : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.assessmentQuestion.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
        include: this.detailInclude(),
      }),
      this.prisma.assessmentQuestion.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const question = await this.prisma.assessmentQuestion.findUnique({
      where: { id },
      include: this.detailInclude(),
    });
    if (!question) {
      throw new NotFoundException('Assessment question not found');
    }

    return question;
  }

  async update(id: string, dto: UpdateAssessmentQuestionDto, actorUserId?: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.assessmentQuestion.findUnique({
          where: { id },
          include: { options: { orderBy: { orderIndex: 'asc' } } },
        });
        if (!existing) {
          throw new NotFoundException('Assessment question not found');
        }
        if (dto.skillId) {
          await this.ensureSkillExists(tx, dto.skillId);
        }

        const questionType = dto.questionType ?? existing.questionType;
        const optionsToValidate =
          dto.options ??
          this.toOptionDtos(existing.options);
        const hasVersionedChanges = this.hasVersionedQuestionChanges(dto);

        if (hasVersionedChanges) {
          this.validateOptions(questionType, optionsToValidate);
        }

        const isUsed = await this.isQuestionUsed(tx, id);
        if (isUsed && hasVersionedChanges) {
          const newQuestion = await this.createQuestionVersion(tx, existing, dto);

          return {
            question: newQuestion,
            versioned: true,
            previousQuestionId: existing.id,
          };
        }

        const { options, ...questionData } = dto;
        const question = await tx.assessmentQuestion.update({
          where: { id },
          data: questionData,
        });

        if (options) {
          await tx.assessmentOption.deleteMany({ where: { questionId: id } });
          await tx.assessmentOption.createMany({
            data: this.toOptionCreateManyInput(options).map((option) => ({
              ...option,
              questionId: id,
            })),
          });
        }

        const updatedQuestion = await tx.assessmentQuestion.findUniqueOrThrow({
          where: { id: question.id },
          include: this.detailInclude(),
        });

        return {
          question: updatedQuestion,
          versioned: false,
          previousQuestionId: undefined,
        };
      });
      await this.activityLogs.record({
        actorUserId,
        action: result.versioned
          ? 'ASSESSMENT_QUESTION_VERSIONED'
          : 'ASSESSMENT_QUESTION_UPDATED',
        entityType: 'AssessmentQuestion',
        entityId: result.question.id,
        description: {
          skillId: result.question.skillId,
          questionType: result.question.questionType,
          status: result.question.status,
          changedFields: Object.keys(dto),
          previousQuestionId: result.previousQuestionId,
        },
      });

      return result.question;
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string, actorUserId?: string) {
    await this.findOne(id);

    const question = await this.prisma.assessmentQuestion.update({
      where: { id },
      data: { status: QuestionStatus.INACTIVE },
      include: this.detailInclude(),
    });
    await this.activityLogs.record({
      actorUserId,
      action: 'ASSESSMENT_QUESTION_DEACTIVATED',
      entityType: 'AssessmentQuestion',
      entityId: question.id,
      description: {
        skillId: question.skillId,
        questionType: question.questionType,
      },
    });

    return question;
  }

  private validateOptions(
    questionType: QuestionType,
    options: CreateAssessmentOptionDto[],
  ) {
    if (!options.length) {
      throw new BadRequestException('Options cannot be empty');
    }

    const correctCount = options.filter((option) => option.isCorrect).length;

    if (questionType === QuestionType.SINGLE_CHOICE && correctCount !== 1) {
      throw new BadRequestException('SINGLE_CHOICE must have exactly one correct option');
    }
    if (questionType === QuestionType.TRUE_FALSE) {
      if (options.length !== 2) {
        throw new BadRequestException('TRUE_FALSE must have exactly two options');
      }
      if (correctCount !== 1) {
        throw new BadRequestException('TRUE_FALSE must have exactly one correct option');
      }
    }
  }

  private toOptionCreateManyInput(options: CreateAssessmentOptionDto[]) {
    return options.map((option, index) => ({
      optionText: option.optionText,
      isCorrect: option.isCorrect,
      orderIndex: option.orderIndex ?? index + 1,
    }));
  }

  private async ensureSkillExists(
    tx: Prisma.TransactionClient,
    skillId: string,
  ) {
    const exists = await tx.skill.findUnique({
      where: { id: skillId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Skill not found');
    }
  }

  private detailInclude() {
    return {
      skill: { include: { category: true } },
      options: { orderBy: { orderIndex: 'asc' as const } },
    };
  }

  private hasVersionedQuestionChanges(dto: UpdateAssessmentQuestionDto) {
    return VERSIONED_QUESTION_FIELDS.some((field) => dto[field] !== undefined);
  }

  private async isQuestionUsed(
    tx: Prisma.TransactionClient,
    questionId: string,
  ) {
    const [itemCount, answerCount] = await Promise.all([
      tx.assessmentQuestionItem.count({ where: { questionId } }),
      tx.assessmentAnswer.count({ where: { questionId } }),
    ]);

    return itemCount + answerCount > 0;
  }

  private async createQuestionVersion(
    tx: Prisma.TransactionClient,
    existing: Prisma.AssessmentQuestionGetPayload<{
      include: { options: true };
    }>,
    dto: UpdateAssessmentQuestionDto,
  ) {
    const questionType = dto.questionType ?? existing.questionType;
    const options = dto.options ?? this.toOptionDtos(existing.options);

    this.validateOptions(questionType, options);

    await tx.assessmentQuestion.update({
      where: { id: existing.id },
      data: { status: QuestionStatus.INACTIVE },
    });

    return tx.assessmentQuestion.create({
      data: {
        skillId: dto.skillId ?? existing.skillId,
        questionText: dto.questionText ?? existing.questionText,
        questionType,
        level: dto.level ?? existing.level,
        explanation: dto.explanation ?? existing.explanation,
        status: dto.status ?? existing.status,
        options: {
          create: this.toOptionCreateManyInput(options),
        },
      },
      include: this.detailInclude(),
    });
  }

  private toOptionDtos(
    options: Array<{
      optionText: string;
      isCorrect: boolean;
      orderIndex: number;
    }>,
  ): CreateAssessmentOptionDto[] {
    return options.map((option) => ({
      optionText: option.optionText,
      isCorrect: option.isCorrect,
      orderIndex: option.orderIndex,
    }));
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new ConflictException('Assessment question is linked to missing data');
      }
    }

    throw error;
  }
}
