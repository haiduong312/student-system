import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AssessmentStatus,
  CatalogStatus,
  QuestionStatus,
  QuestionType,
  SkillType,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssessmentsService } from './assessments.service';

const now = new Date('2026-06-25T08:00:00.000Z');

const activeProfile = (specializationId: string | null) => ({
  id: 'student-1',
  profile: {
    careerGoalId: 'goal-1',
    specializationId,
    careerGoal: {
      id: 'goal-1',
      status: CatalogStatus.ACTIVE,
    },
    specialization: specializationId
      ? {
          id: specializationId,
          careerGoalId: 'goal-1',
          status: CatalogStatus.ACTIVE,
        }
      : null,
  },
});

const assessmentItem = (input: {
  questionId: string;
  skillId?: string;
  level?: number;
}) => ({
  id: `item-${input.questionId}`,
  assessmentId: 'assessment-1',
  questionId: input.questionId,
  skillId: input.skillId ?? 'skill-1',
  orderIndex: 1,
  createdAt: now,
  updatedAt: now,
  question: {
    id: input.questionId,
    skillId: input.skillId ?? 'skill-1',
    questionText: `${input.questionId}?`,
    questionType: QuestionType.SINGLE_CHOICE,
    level: input.level ?? 1,
    explanation: null,
    status: QuestionStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    skill: {
      id: input.skillId ?? 'skill-1',
      name: 'NestJS',
      type: SkillType.CAREER_SPECIFIC,
    },
    options: [
      {
        id: `${input.questionId}-option-correct`,
        questionId: input.questionId,
        optionText: 'A',
        isCorrect: true,
        orderIndex: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `${input.questionId}-option-wrong`,
        questionId: input.questionId,
        optionText: 'B',
        isCorrect: false,
        orderIndex: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
  },
});

const submitPrisma = (assessment: any, profile = activeProfile('backend-1')) => ({
  student: {
    findUnique: async () => profile,
  },
  $transaction: async (callback: any) =>
    callback({
      assessment: {
        findUnique: async () => assessment,
        update: async () => ({}),
      },
      assessmentAnswer: {
        deleteMany: async () => ({}),
        createMany: async () => ({}),
      },
      assessmentSkillResult: {
        deleteMany: async () => ({}),
        createMany: async () => ({}),
      },
      studentSkill: {
        findUnique: async () => ({ id: 'student-skill-1', currentLevel: 0 }),
        update: async () => ({}),
        create: async () => ({}),
      },
    }),
});

const validQuestion = (input: {
  id: string;
  skillId: string;
  level: number;
  status?: QuestionStatus;
}) => ({
  id: input.id,
  skillId: input.skillId,
  questionText: `${input.id}?`,
  questionType: QuestionType.SINGLE_CHOICE,
  level: input.level,
  status: input.status ?? QuestionStatus.ACTIVE,
  explanation: null,
  createdAt: now,
  updatedAt: now,
  options: [
    {
      id: `${input.id}-correct`,
      questionId: input.id,
      optionText: 'Correct',
      isCorrect: true,
      orderIndex: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${input.id}-wrong`,
      questionId: input.id,
      optionText: 'Wrong',
      isCorrect: false,
      orderIndex: 2,
      createdAt: now,
      updatedAt: now,
    },
  ],
});

const validQuestionPair = (input: {
  prefix: string;
  skillId: string;
  level: number;
}) => [
  validQuestion({
    id: `${input.prefix}-a`,
    skillId: input.skillId,
    level: input.level,
  }),
  validQuestion({
    id: `${input.prefix}-b`,
    skillId: input.skillId,
    level: input.level,
  }),
];

const requiredSkill = (input: {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  learningOrder?: number;
  specializationId?: string | null;
}) => ({
  skillId: input.skillId,
  requiredLevel: input.requiredLevel,
  learningOrder: input.learningOrder ?? 1,
  specializationId: input.specializationId ?? null,
  skill: {
    id: input.skillId,
    name: input.skillName,
    type: SkillType.CAREER_SPECIFIC,
  },
});

const coveragePrisma = (input: {
  requiredSkills: any[];
  questions: any[];
  onCreate?: (args: any) => void;
}) => ({
  careerRequiredSkill: {
    findMany: async ({ where }: any) =>
      input.requiredSkills.filter(
        (skill) =>
          skill.careerGoalId === undefined ||
          skill.careerGoalId === where.careerGoalId,
      ),
  },
  assessmentQuestion: {
    findMany: async ({ where }: any) =>
      input.questions.filter(
        (question) =>
          question.skillId === where.skillId &&
          question.status === where.status &&
          question.level <= where.level.lte,
      ),
  },
  $transaction: async (callback: any) =>
    callback({
      assessment: {
        create: async (args: any) => {
          input.onCreate?.(args);
          return {
            id: 'assessment-1',
            careerGoalId: args.data.careerGoalId,
            specializationId: args.data.specializationId,
            startedAt: now,
          };
        },
      },
    }),
});

describe('AssessmentsService specialization scope', () => {
  it('stores specializationId when starting an assessment', async () => {
    const startedAt = new Date('2026-06-25T08:00:00.000Z');
    let createdAssessmentData: any;

    const prisma = {
      student: {
        findUnique: async () => activeProfile('frontend-1'),
      },
      assessment: {
        findFirst: async () => null,
        count: async () => 0,
      },
      careerRequiredSkill: {
        findMany: async () => [
          {
            skillId: 'skill-1',
            requiredLevel: 1,
            learningOrder: 1,
            specializationId: 'frontend-1',
            skill: {
              id: 'skill-1',
              name: 'React',
              type: SkillType.CAREER_SPECIFIC,
            },
          },
        ],
      },
      assessmentQuestion: {
        findMany: async () =>
          validQuestionPair({
            prefix: 'react-level-1',
            skillId: 'skill-1',
            level: 1,
          }),
      },
      $transaction: async (callback: any) =>
        callback({
          assessment: {
            create: async (args: any) => {
              createdAssessmentData = args.data;
              return {
                id: 'assessment-1',
                careerGoalId: args.data.careerGoalId,
                specializationId: args.data.specializationId,
                startedAt,
              };
            },
          },
        }),
    };
    const service = new AssessmentsService(prisma as any);

    const result = await service.startAssessment('user-1', {});

    assert.equal(createdAssessmentData.studentId, 'student-1');
    assert.equal(createdAssessmentData.careerGoalId, 'goal-1');
    assert.equal(createdAssessmentData.specializationId, 'frontend-1');
    assert.equal(createdAssessmentData.status, AssessmentStatus.IN_PROGRESS);
    assert.equal(result.specializationId, 'frontend-1');
  });

  it('scopes active attempts, attempt count, and cooldown by specializationId', async () => {
    const findFirstWheres: any[] = [];
    let countWhere: any;
    const service = new AssessmentsService({
      assessment: {
        findFirst: async ({ where }: any) => {
          findFirstWheres.push(where);
          if (
            where.status === AssessmentStatus.IN_PROGRESS &&
            where.specializationId !== 'backend-1'
          ) {
            return {
              id: 'frontend-active-assessment',
              startedAt: new Date(),
            };
          }

          return null;
        },
        count: async ({ where }: any) => {
          countWhere = where;
          return where.specializationId === 'backend-1' ? 0 : 3;
        },
      },
    } as any);

    await (service as any).assertCanStartAssessment({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
    });

    assert.equal(findFirstWheres[0].specializationId, 'backend-1');
    assert.equal(countWhere.specializationId, 'backend-1');
    assert.equal(findFirstWheres[1].specializationId, 'backend-1');
  });

  it('does not let an in-progress assessment from an old specialization block the new specialization', async () => {
    const queriedScopes: any[] = [];
    const service = new AssessmentsService({
      assessment: {
        findFirst: async ({ where }: any) => {
          queriedScopes.push(where);
          if (
            where.status === AssessmentStatus.IN_PROGRESS &&
            where.specializationId === 'frontend-1'
          ) {
            return {
              id: 'frontend-active-assessment',
              startedAt: new Date(),
            };
          }

          return null;
        },
        count: async () => 0,
      },
    } as any);

    await (service as any).assertCanStartAssessment({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
    });

    assert.equal(queriedScopes[0].careerGoalId, 'goal-1');
    assert.equal(queriedScopes[0].specializationId, 'backend-1');
  });

  it('keeps null specialization as its own assessment scope', async () => {
    let countWhere: any;
    const service = new AssessmentsService({
      assessment: {
        findFirst: async () => null,
        count: async ({ where }: any) => {
          countWhere = where;
          return 0;
        },
      },
    } as any);

    await (service as any).assertCanStartAssessment({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: null,
    });

    assert.equal(countWhere.specializationId, null);
  });

  it('rejects submitting an assessment from a previous specialization', async () => {
    const service = new AssessmentsService({
      student: {
        findUnique: async () => activeProfile('backend-1'),
      },
      $transaction: async (callback: any) =>
        callback({
          assessment: {
            findUnique: async () => ({
              id: 'assessment-1',
              studentId: 'student-1',
              careerGoalId: 'goal-1',
              specializationId: 'frontend-1',
              status: AssessmentStatus.IN_PROGRESS,
              startedAt: new Date(),
              items: [],
            }),
          },
        }),
    } as any);

    await assert.rejects(
      () =>
        service.submitAssessment('user-1', 'assessment-1', {
          answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
        }),
      BadRequestException,
    );
  });

  it('rejects submitting another student assessment', async () => {
    const service = new AssessmentsService(
      submitPrisma({
        id: 'assessment-1',
        studentId: 'student-2',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AssessmentStatus.IN_PROGRESS,
        startedAt: new Date(),
        items: [assessmentItem({ questionId: 'question-1' })],
      }) as any,
    );

    await assert.rejects(
      () =>
        service.submitAssessment('user-1', 'assessment-1', {
          answers: [
            {
              questionId: 'question-1',
              selectedOptionId: 'question-1-option-correct',
            },
          ],
        }),
      ForbiddenException,
    );
  });

  it('rejects submitting assessments that are no longer in progress', async () => {
    for (const status of [
      AssessmentStatus.SUBMITTED,
      AssessmentStatus.GRADED,
      AssessmentStatus.CANCELLED,
    ]) {
      const service = new AssessmentsService(
        submitPrisma({
          id: 'assessment-1',
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
          status,
          startedAt: new Date(),
          items: [assessmentItem({ questionId: 'question-1' })],
        }) as any,
      );

      await assert.rejects(
        () =>
          service.submitAssessment('user-1', 'assessment-1', {
            answers: [
              {
                questionId: 'question-1',
                selectedOptionId: 'question-1-option-correct',
              },
            ],
          }),
        BadRequestException,
      );
    }
  });

  it('rejects an answer for a question that does not belong to the assessment', async () => {
    const service = new AssessmentsService(
      submitPrisma({
        id: 'assessment-1',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AssessmentStatus.IN_PROGRESS,
        startedAt: new Date(),
        items: [assessmentItem({ questionId: 'question-1' })],
      }) as any,
    );

    await assert.rejects(
      () =>
        service.submitAssessment('user-1', 'assessment-1', {
          answers: [
            {
              questionId: 'question-2',
              selectedOptionId: 'question-2-option-correct',
            },
          ],
        }),
      /Question does not belong to this assessment/,
    );
  });

  it('rejects a selected option that does not belong to the assessment question', async () => {
    const service = new AssessmentsService(
      submitPrisma({
        id: 'assessment-1',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AssessmentStatus.IN_PROGRESS,
        startedAt: new Date(),
        items: [assessmentItem({ questionId: 'question-1' })],
      }) as any,
    );

    await assert.rejects(
      () =>
        service.submitAssessment('user-1', 'assessment-1', {
          answers: [
            {
              questionId: 'question-1',
              selectedOptionId: 'question-2-option-correct',
            },
          ],
        }),
      /Selected option does not belong to the question/,
    );
  });
});

describe('AssessmentsService question coverage', () => {
  it('creates an assessment when each required skill has two active questions for every level through requiredLevel', async () => {
    let createArgs: any;
    const service = new AssessmentsService(
      coveragePrisma({
        requiredSkills: [
          {
            careerGoalId: 'goal-1',
            ...requiredSkill({
              skillId: 'skill-1',
              skillName: 'NestJS',
              requiredLevel: 2,
            }),
          },
        ],
        questions: [
          ...validQuestionPair({
            prefix: 'question-level-1',
            skillId: 'skill-1',
            level: 1,
          }),
          ...validQuestionPair({
            prefix: 'question-level-2',
            skillId: 'skill-1',
            level: 2,
          }),
        ],
        onCreate: (args) => {
          createArgs = args;
        },
      }) as any,
    );

    const result = await service.generateAssessmentForProfile({
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
    });

    assert.equal(createArgs.data.studentId, 'student-1');
    assert.equal(createArgs.data.careerGoalId, 'goal-1');
    assert.equal(createArgs.data.specializationId, 'backend-1');
    assert.deepEqual(
      createArgs.data.items.create.map((item: any) => item.questionId).sort(),
      [
        'question-level-1-a',
        'question-level-1-b',
        'question-level-2-a',
        'question-level-2-b',
      ],
    );
    assert.equal(result.questions.length, 4);
  });

  it('throws BadRequestException when any level up to requiredLevel is missing', async () => {
    const service = new AssessmentsService(
      coveragePrisma({
        requiredSkills: [
          {
            careerGoalId: 'goal-1',
            ...requiredSkill({
              skillId: 'skill-1',
              skillName: 'NestJS',
              requiredLevel: 2,
            }),
          },
        ],
        questions: validQuestionPair({
          prefix: 'question-level-1',
          skillId: 'skill-1',
          level: 1,
        }),
      }) as any,
    );

    await assert.rejects(
      () =>
        service.generateAssessmentForProfile({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
        }),
      /NestJS.*fewer than 2 eligible ACTIVE questions for level\(s\): 2/,
    );
  });

  it('treats one active plus one inactive question as insufficient coverage', async () => {
    const service = new AssessmentsService(
      coveragePrisma({
        requiredSkills: [
          {
            careerGoalId: 'goal-1',
            ...requiredSkill({
              skillId: 'skill-1',
              skillName: 'NestJS',
              requiredLevel: 2,
            }),
          },
        ],
        questions: [
          ...validQuestionPair({
            prefix: 'question-level-1',
            skillId: 'skill-1',
            level: 1,
          }),
          validQuestion({ id: 'active-question-level-2', skillId: 'skill-1', level: 2 }),
          validQuestion({
            id: 'inactive-question-level-2',
            skillId: 'skill-1',
            level: 2,
            status: QuestionStatus.INACTIVE,
          }),
        ],
      }) as any,
    );

    await assert.rejects(
      () =>
        service.generateAssessmentForProfile({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
        }),
      /NestJS.*fewer than 2 eligible ACTIVE questions for level\(s\): 2/,
    );
  });

  it('reports the specific skill and missing level when one of many skills lacks coverage', async () => {
    const service = new AssessmentsService(
      coveragePrisma({
        requiredSkills: [
          {
            careerGoalId: 'goal-1',
            ...requiredSkill({
              skillId: 'skill-ok',
              skillName: 'NestJS',
              requiredLevel: 2,
              learningOrder: 1,
            }),
          },
          {
            careerGoalId: 'goal-1',
            ...requiredSkill({
              skillId: 'skill-missing',
              skillName: 'PostgreSQL',
              requiredLevel: 3,
              learningOrder: 2,
            }),
          },
        ],
        questions: [
          ...validQuestionPair({ prefix: 'nestjs-level-1', skillId: 'skill-ok', level: 1 }),
          ...validQuestionPair({ prefix: 'nestjs-level-2', skillId: 'skill-ok', level: 2 }),
          ...validQuestionPair({
            prefix: 'postgres-level-1',
            skillId: 'skill-missing',
            level: 1,
          }),
          ...validQuestionPair({
            prefix: 'postgres-level-3',
            skillId: 'skill-missing',
            level: 3,
          }),
        ],
      }) as any,
    );

    await assert.rejects(
      () =>
        service.generateAssessmentForProfile({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
        }),
      /PostgreSQL.*fewer than 2 eligible ACTIVE questions for level\(s\): 2/,
    );
  });

  it('uses the updated requiredLevel when validating question coverage', async () => {
    const service = new AssessmentsService(
      coveragePrisma({
        requiredSkills: [
          {
            careerGoalId: 'goal-1',
            ...requiredSkill({
              skillId: 'skill-1',
              skillName: 'NestJS',
              requiredLevel: 3,
            }),
          },
        ],
        questions: [
          ...validQuestionPair({
            prefix: 'question-level-1',
            skillId: 'skill-1',
            level: 1,
          }),
          ...validQuestionPair({
            prefix: 'question-level-2',
            skillId: 'skill-1',
            level: 2,
          }),
        ],
      }) as any,
    );

    await assert.rejects(
      () =>
        service.generateAssessmentForProfile({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
        }),
      /NestJS.*requiredLevel=3, missingLevels=3/,
    );
  });
});
