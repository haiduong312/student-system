import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentQuestion,
  AssessmentOption,
  AssessmentStatus,
  CatalogStatus,
  Prisma,
  QuestionStatus,
  SkillType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StartAssessmentDto } from './dto/start-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

const MAX_QUESTIONS_PER_SKILL = 6;
const LEVEL_PASS_THRESHOLD = 60;
const MAX_ASSESSMENT_ATTEMPTS = 3;
const ASSESSMENT_COOLDOWN_MINUTES = 30;
const ASSESSMENT_TIME_LIMIT_MINUTES = 60;
const COMPLETED_ASSESSMENT_STATUSES = [
  AssessmentStatus.SUBMITTED,
  AssessmentStatus.GRADED,
] as const;

type QuestionWithOptions = AssessmentQuestion & {
  options: AssessmentOption[];
};

interface RequiredSkillForAssessment {
  skillId: string;
  skillName: string;
  skillType: SkillType;
  requiredLevel: number;
  learningOrder: number;
  specificityRank: number;
}

interface AssessmentProfileContext {
  studentId: string;
  careerGoalId: string;
  specializationId: string | null;
}

interface SelectedQuestion {
  question: QuestionWithOptions;
  skill: RequiredSkillForAssessment;
}

interface AnswerGrade {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

interface LevelStat {
  total: number;
  correct: number;
}

interface SkillGrade {
  skillId: string;
  skillName: string;
  skillType: SkillType;
  calculatedLevel: number;
  totalQuestions: number;
  correctQuestions: number;
  levelBreakdown: Record<string, LevelStat & { percentage: number }>;
}

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async startAssessment(userId: string, _dto: StartAssessmentDto = {}) {
    const profile = await this.getAssessmentProfile(userId);

    await this.assertCanStartAssessment(profile);

    return this.generateAssessmentForProfile(profile);
  }

  async submitAssessment(
    userId: string,
    assessmentId: string,
    dto: SubmitAssessmentDto,
  ): Promise<any> {
    const studentId = await this.getStudentIdByUserId(userId);
    this.assertNoDuplicateAnswers(dto);

    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          items: {
            orderBy: { orderIndex: 'asc' },
            include: {
              question: {
                include: {
                  skill: true,
                  options: true,
                },
              },
            },
          },
        },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }
      if (assessment.studentId !== studentId) {
        throw new ForbiddenException('Assessment does not belong to current student');
      }
      if (assessment.status !== AssessmentStatus.IN_PROGRESS) {
        throw new BadRequestException('Assessment has already been submitted');
      }
      this.assertAssessmentWithinTimeLimit(assessment.startedAt);
      if (!assessment.items.length) {
        throw new BadRequestException('Assessment has no questions');
      }

      const gradedAnswers = this.gradeAnswers(assessment.items, dto);
      const skillGrades = this.calculateSkillGrades(assessment.items, gradedAnswers);

      await tx.assessmentAnswer.deleteMany({ where: { assessmentId } });
      await tx.assessmentAnswer.createMany({
        data: gradedAnswers.map((answer) => ({
          assessmentId,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          isCorrect: answer.isCorrect,
        })),
      });

      await tx.assessmentSkillResult.deleteMany({ where: { assessmentId } });
      await tx.assessmentSkillResult.createMany({
        data: skillGrades.map((result) => ({
          assessmentId,
          skillId: result.skillId,
          calculatedLevel: result.calculatedLevel,
          totalQuestions: result.totalQuestions,
          correctQuestions: result.correctQuestions,
          levelBreakdown: result.levelBreakdown as unknown as Prisma.InputJsonValue,
        })),
      });

      for (const result of skillGrades) {
        await this.applyBestAssessmentSkillLevel(tx, studentId, result);
      }

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: AssessmentStatus.GRADED,
          submittedAt: new Date(),
        },
      });

      return {
        assessmentId,
        status: AssessmentStatus.GRADED,
        skillResults: skillGrades,
      };
    });
  }

  async generateAssessmentForProfile(profile: AssessmentProfileContext) {
    const requiredSkills = await this.getRequiredSkills(
      profile.careerGoalId,
      profile.specializationId,
    );
    if (!requiredSkills.length) {
      throw new BadRequestException('Career goal has no required skills configured');
    }

    const selectedQuestions: SelectedQuestion[] = [];
    const warnings: Array<{ skillId: string; skillName: string; message: string }> = [];

    for (const requiredSkill of requiredSkills) {
      const candidates = await this.getCandidateQuestions(requiredSkill);
      const desiredCount = Math.min(
        MAX_QUESTIONS_PER_SKILL,
        Math.max(requiredSkill.requiredLevel * 2, requiredSkill.requiredLevel),
      );
      const selectedForSkill = this.selectQuestionsForSkill(
        candidates,
        requiredSkill.requiredLevel,
        desiredCount,
      );

      if (!selectedForSkill.length) {
        warnings.push({
          skillId: requiredSkill.skillId,
          skillName: requiredSkill.skillName,
          message: 'No active questions found for this skill.',
        });
        continue;
      }
      if (selectedForSkill.length < desiredCount) {
        warnings.push({
          skillId: requiredSkill.skillId,
          skillName: requiredSkill.skillName,
          message: 'Not enough active questions for this skill.',
        });
      }

      selectedQuestions.push(
        ...selectedForSkill.map((question) => ({
          question,
          skill: requiredSkill,
        })),
      );
    }

    if (!selectedQuestions.length) {
      throw new BadRequestException(
        'No active assessment questions found for this career goal',
      );
    }

    const assessment = await this.prisma.$transaction((tx) =>
      tx.assessment.create({
        data: {
          studentId: profile.studentId,
          careerGoalId: profile.careerGoalId,
          status: AssessmentStatus.IN_PROGRESS,
          items: {
            create: selectedQuestions.map((selected, index) => ({
              questionId: selected.question.id,
              skillId: selected.skill.skillId,
              orderIndex: index + 1,
            })),
          },
        },
        select: { id: true, careerGoalId: true, startedAt: true },
      }),
    );

    return {
      assessmentId: assessment.id,
      careerGoalId: assessment.careerGoalId,
      specializationId: profile.specializationId,
      startedAt: assessment.startedAt,
      expiresAt: this.addMinutes(
        assessment.startedAt,
        ASSESSMENT_TIME_LIMIT_MINUTES,
      ),
      attemptPolicy: {
        maxAttempts: MAX_ASSESSMENT_ATTEMPTS,
        cooldownMinutes: ASSESSMENT_COOLDOWN_MINUTES,
        timeLimitMinutes: ASSESSMENT_TIME_LIMIT_MINUTES,
      },
      questions: selectedQuestions.map((selected) =>
        this.toStartQuestionResponse(selected),
      ),
      warnings,
    };
  }

  private async applyBestAssessmentSkillLevel(
    tx: Prisma.TransactionClient,
    studentId: string,
    result: SkillGrade,
  ) {
    const existingSkill = await tx.studentSkill.findUnique({
      where: {
        studentId_skillId: {
          studentId,
          skillId: result.skillId,
        },
      },
      select: { id: true, currentLevel: true },
    });

    if (!existingSkill) {
      await tx.studentSkill.create({
        data: {
          studentId,
          skillId: result.skillId,
          currentLevel: result.calculatedLevel,
        },
      });
      return;
    }

    if (result.calculatedLevel > existingSkill.currentLevel) {
      await tx.studentSkill.update({
        where: { id: existingSkill.id },
        data: { currentLevel: result.calculatedLevel },
      });
    }
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

  private async getAssessmentProfile(
    userId: string,
  ): Promise<AssessmentProfileContext> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        profile: {
          include: {
            careerGoal: true,
            specialization: true,
          },
        },
      },
    });

    if (!student) {
      throw new ForbiddenException('Current user is not a student');
    }
    if (!student.profile) {
      throw new BadRequestException('Student profile has not been created');
    }
    if (!student.profile.careerGoalId || !student.profile.careerGoal) {
      throw new BadRequestException('Student has not selected a career goal');
    }
    if (student.profile.careerGoal.status !== CatalogStatus.ACTIVE) {
      throw new BadRequestException('Selected career goal is not active');
    }
    if (
      student.profile.specialization &&
      student.profile.specialization.careerGoalId !== student.profile.careerGoalId
    ) {
      throw new BadRequestException(
        'Selected specialization does not belong to the selected career goal',
      );
    }
    if (
      student.profile.specialization &&
      student.profile.specialization.status !== CatalogStatus.ACTIVE
    ) {
      throw new BadRequestException('Selected specialization is not active');
    }

    return {
      studentId: student.id,
      careerGoalId: student.profile.careerGoalId,
      specializationId: student.profile.specializationId,
    };
  }

  private async getRequiredSkills(
    careerGoalId: string,
    specializationId?: string | null,
  ): Promise<RequiredSkillForAssessment[]> {
    const requiredSkills = await this.prisma.careerRequiredSkill.findMany({
      where: {
        careerGoalId,
        isRequired: true,
        skill: { status: CatalogStatus.ACTIVE },
        OR: specializationId
          ? [{ specializationId: null }, { specializationId }]
          : [{ specializationId: null }],
      },
      orderBy: [{ learningOrder: 'asc' }, { updatedAt: 'asc' }],
      include: { skill: true },
    });
    const bySkillId = new Map<string, RequiredSkillForAssessment>();

    for (const requiredSkill of requiredSkills) {
      const existing = bySkillId.get(requiredSkill.skillId);
      const candidate = {
        skillId: requiredSkill.skillId,
        skillName: requiredSkill.skill.name,
        skillType: requiredSkill.skill.type,
        requiredLevel: requiredSkill.requiredLevel,
        learningOrder: requiredSkill.learningOrder,
        specificityRank:
          specializationId && requiredSkill.specializationId === specializationId ? 1 : 0,
      };

      if (!existing || candidate.specificityRank >= existing.specificityRank) {
        bySkillId.set(requiredSkill.skillId, candidate);
      }
    }

    return Array.from(bySkillId.values()).sort((a, b) => {
      if (a.learningOrder !== b.learningOrder) {
        return a.learningOrder - b.learningOrder;
      }

      return a.skillName.localeCompare(b.skillName);
    });
  }

  private getCandidateQuestions(requiredSkill: RequiredSkillForAssessment) {
    return this.prisma.assessmentQuestion.findMany({
      where: {
        skillId: requiredSkill.skillId,
        skill: { status: CatalogStatus.ACTIVE },
        status: QuestionStatus.ACTIVE,
        level: { lte: requiredSkill.requiredLevel },
      },
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
      include: { options: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  private selectQuestionsForSkill(
    questions: QuestionWithOptions[],
    requiredLevel: number,
    desiredCount: number,
  ) {
    const selected = new Map<string, QuestionWithOptions>();
    const byLevel = new Map<number, QuestionWithOptions[]>();

    for (const question of questions) {
      const levelQuestions = byLevel.get(question.level) ?? [];
      levelQuestions.push(question);
      byLevel.set(question.level, levelQuestions);
    }

    for (let level = 1; level <= requiredLevel; level += 1) {
      const question = this.shuffleQuestions(byLevel.get(level) ?? []).find(
        (item) => !selected.has(item.id),
      );
      if (question) {
        selected.set(question.id, question);
      }
      if (selected.size >= desiredCount) {
        return Array.from(selected.values());
      }
    }

    for (const question of this.shuffleQuestions(questions)) {
      if (!selected.has(question.id)) {
        selected.set(question.id, question);
      }
      if (selected.size >= desiredCount) {
        break;
      }
    }

    return Array.from(selected.values());
  }

  private shuffleQuestions(questions: QuestionWithOptions[]) {
    const shuffled = [...questions];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  }

  private toStartQuestionResponse(selected: SelectedQuestion) {
    return {
      id: selected.question.id,
      skillId: selected.skill.skillId,
      skillName: selected.skill.skillName,
      skillType: selected.skill.skillType,
      questionText: selected.question.questionText,
      questionType: selected.question.questionType,
      level: selected.question.level,
      options: selected.question.options.map((option) => ({
        id: option.id,
        optionText: option.optionText,
        orderIndex: option.orderIndex,
      })),
    };
  }

  private assertNoDuplicateAnswers(dto: SubmitAssessmentDto) {
    const seenQuestionIds = new Set<string>();

    for (const answer of dto.answers) {
      if (seenQuestionIds.has(answer.questionId)) {
        throw new BadRequestException('Duplicate answers are not allowed');
      }
      seenQuestionIds.add(answer.questionId);
    }
  }

  private gradeAnswers(
    items: Array<{
      questionId: string;
      question: QuestionWithOptions & {
        skill: { id: string; name: string; type: SkillType };
      };
    }>,
    dto: SubmitAssessmentDto,
  ): AnswerGrade[] {
    const itemByQuestionId = new Map(items.map((item) => [item.questionId, item]));
    const answerByQuestionId = new Map(
      dto.answers.map((answer) => [answer.questionId, answer]),
    );

    if (answerByQuestionId.size !== items.length) {
      throw new BadRequestException('Every assessment question must be answered');
    }

    const gradedAnswers: AnswerGrade[] = [];

    for (const item of items) {
      const answer = answerByQuestionId.get(item.questionId);
      if (!answer || !itemByQuestionId.has(answer.questionId)) {
        throw new BadRequestException('Question does not belong to this assessment');
      }

      const selectedOption = item.question.options.find(
        (option) => option.id === answer.selectedOptionId,
      );
      if (!selectedOption) {
        throw new BadRequestException('Selected option does not belong to the question');
      }

      gradedAnswers.push({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect: selectedOption.isCorrect,
      });
    }

    return gradedAnswers;
  }

  private calculateSkillGrades(
    items: Array<{
      questionId: string;
      question: QuestionWithOptions & {
        skill: { id: string; name: string; type: SkillType };
      };
    }>,
    answers: AnswerGrade[],
  ): SkillGrade[] {
    const answerByQuestionId = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );
    const results = new Map<
      string,
      {
        skillId: string;
        skillName: string;
        skillType: SkillType;
        totalQuestions: number;
        correctQuestions: number;
        levelStats: Map<number, LevelStat>;
      }
    >();

    for (const item of items) {
      const skill = item.question.skill;
      const answer = answerByQuestionId.get(item.questionId);
      const isCorrect = answer?.isCorrect ?? false;
      const result =
        results.get(skill.id) ??
        {
          skillId: skill.id,
          skillName: skill.name,
          skillType: skill.type,
          totalQuestions: 0,
          correctQuestions: 0,
          levelStats: new Map<number, LevelStat>(),
        };
      const levelStat =
        result.levelStats.get(item.question.level) ?? { total: 0, correct: 0 };

      result.totalQuestions += 1;
      levelStat.total += 1;
      if (isCorrect) {
        result.correctQuestions += 1;
        levelStat.correct += 1;
      }

      result.levelStats.set(item.question.level, levelStat);
      results.set(skill.id, result);
    }

    return Array.from(results.values()).map((result) => {
      const levelBreakdown = this.toLevelBreakdown(result.levelStats);

      return {
        skillId: result.skillId,
        skillName: result.skillName,
        skillType: result.skillType,
        calculatedLevel: this.calculateCurrentLevel(levelBreakdown),
        totalQuestions: result.totalQuestions,
        correctQuestions: result.correctQuestions,
        levelBreakdown,
      };
    });
  }

  private toLevelBreakdown(levelStats: Map<number, LevelStat>) {
    const breakdown: Record<string, LevelStat & { percentage: number }> = {};
    const levels = Array.from(levelStats.keys()).sort((a, b) => a - b);

    for (const level of levels) {
      const stat = levelStats.get(level);
      if (!stat) {
        continue;
      }

      breakdown[String(level)] = {
        total: stat.total,
        correct: stat.correct,
        percentage: stat.total > 0 ? this.round((stat.correct / stat.total) * 100) : 0,
      };
    }

    return breakdown;
  }

  private calculateCurrentLevel(
    levelBreakdown: Record<string, LevelStat & { percentage: number }>,
    threshold = LEVEL_PASS_THRESHOLD,
  ) {
    let currentLevel = 0;
    const maxLevel = Math.max(0, ...Object.keys(levelBreakdown).map(Number));

    for (let level = 1; level <= maxLevel; level += 1) {
      const stat = levelBreakdown[String(level)];
      if (!stat || stat.total === 0) {
        break;
      }
      if (stat.percentage >= threshold) {
        currentLevel = level;
      } else {
        break;
      }
    }

    return currentLevel;
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }

  private async assertCanStartAssessment(profile: AssessmentProfileContext) {
    const activeAttempt = await this.prisma.assessment.findFirst({
      where: {
        studentId: profile.studentId,
        careerGoalId: profile.careerGoalId,
        status: AssessmentStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: 'desc' },
      select: { id: true, startedAt: true },
    });

    if (activeAttempt) {
      if (!this.isAssessmentExpired(activeAttempt.startedAt)) {
        throw new BadRequestException('Student already has an assessment in progress');
      }

      await this.prisma.assessment.update({
        where: { id: activeAttempt.id },
        data: { status: AssessmentStatus.CANCELLED },
      });
    }

    const completedAttemptCount = await this.prisma.assessment.count({
      where: {
        studentId: profile.studentId,
        careerGoalId: profile.careerGoalId,
        status: { in: [...COMPLETED_ASSESSMENT_STATUSES] },
      },
    });
    if (completedAttemptCount >= MAX_ASSESSMENT_ATTEMPTS) {
      throw new BadRequestException('Maximum assessment attempts reached');
    }

    const latestAttempt = await this.prisma.assessment.findFirst({
      where: {
        studentId: profile.studentId,
        careerGoalId: profile.careerGoalId,
        status: {
          in: [
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.GRADED,
            AssessmentStatus.CANCELLED,
          ],
        },
      },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, submittedAt: true },
    });

    if (!latestAttempt) {
      return;
    }

    const cooldownBase = latestAttempt.submittedAt ?? latestAttempt.startedAt;
    const nextAllowedAt = this.addMinutes(
      cooldownBase,
      ASSESSMENT_COOLDOWN_MINUTES,
    );

    if (Date.now() < nextAllowedAt.getTime()) {
      throw new BadRequestException(
        `Please wait ${ASSESSMENT_COOLDOWN_MINUTES} minutes before starting another assessment`,
      );
    }
  }

  private assertAssessmentWithinTimeLimit(startedAt: Date) {
    if (this.isAssessmentExpired(startedAt)) {
      throw new BadRequestException('Assessment time limit has expired');
    }
  }

  private isAssessmentExpired(startedAt: Date) {
    return Date.now() > this.addMinutes(startedAt, ASSESSMENT_TIME_LIMIT_MINUTES).getTime();
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
}
