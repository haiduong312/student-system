import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuestionStatus, QuestionType } from '@prisma/client';
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

@Injectable()
export class AssessmentQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssessmentQuestionDto) {
    this.validateOptions(dto.questionType, dto.options);

    try {
      return await this.prisma.$transaction(async (tx) => {
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

  async update(id: string, dto: UpdateAssessmentQuestionDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
          existing.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            orderIndex: option.orderIndex,
          }));
        this.validateOptions(questionType, optionsToValidate);

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

        return tx.assessmentQuestion.findUniqueOrThrow({
          where: { id: question.id },
          include: this.detailInclude(),
        });
      });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.assessmentQuestion.update({
      where: { id },
      data: { status: QuestionStatus.INACTIVE },
      include: this.detailInclude(),
    });
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
    if (questionType === QuestionType.MULTIPLE_CHOICE && correctCount < 1) {
      throw new BadRequestException('MULTIPLE_CHOICE must have at least one correct option');
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

  private handleKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new ConflictException('Assessment question is linked to missing data');
      }
    }

    throw error;
  }
}
