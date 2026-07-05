import { expect, test } from '../fixtures';
import { AssessmentPage } from '../pages';
import {
  AdminApiClient,
  type ApiAssessmentQuestion,
  type ApiCareerRequiredSkill,
  type ApiCatalogRecord,
  type ApiSkill,
} from '../utils/admin-api';
import {
  ProfileApiClient,
  type ApiStudentProfile,
} from '../utils/profile-api';
import { uniqueE2EName } from '../utils/test-data';

interface AssessmentStartData {
  assessmentId: string;
  careerGoalId: string;
  specializationId?: string | null;
  questions: Array<{
    id: string;
    questionText: string;
    skillName: string;
    options: Array<{ id: string; optionText: string }>;
  }>;
}

interface AssessmentSubmitData {
  assessmentId: string;
  status: 'GRADED';
  skillResults: Array<{
    skillId: string;
    skillName: string;
    totalQuestions: number;
    correctQuestions: number;
    calculatedLevel: number;
  }>;
}

test.describe('Student assessment flow', () => {
  test.describe.configure({ timeout: 90_000 });

  test('starts, validates required answers, grades, and blocks duplicate submission', async ({
    studentPage,
    adminPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const originalProfile = await studentApi.getMyProfile();
    const context = await seedAssessmentContext(adminApi, [1, 1], 1);
    const assessment = new AssessmentPage(studentPage);

    try {
      await studentApi.updateMyProfile({
        careerGoalId: context.careerGoal.id,
        specializationId: null,
      });
      await assessment.goto();
      await assessment.expectLoaded();
      await assessment.expectContext(context.careerGoal.name);

      const startResponse = studentPage.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('/api/assessments/start'),
      );
      await assessment.startButton.click();
      const rawStartResponse = await startResponse;
      const rawStartBody = (await rawStartResponse.json()) as Record<string, unknown>;
      expect(rawStartResponse.ok(), JSON.stringify(rawStartBody)).toBe(true);
      const startData = unwrapResponseData<AssessmentStartData>(rawStartBody);
      await expect(assessment.quizTitle).toBeVisible();

      expect(startData.careerGoalId).toBe(context.careerGoal.id);
      expect(startData.specializationId).toBeNull();
      expect(startData.questions.length).toBeGreaterThan(1);
      await assessment.expectInProgress(startData.questions.length);
      await assessment.expectSubmitDisabled();

      await assessment.answerQuestion(
        startData.questions[0].questionText,
        startData.questions[0].options[0].optionText,
      );
      await assessment.expectSubmitDisabled();

      for (const question of startData.questions.slice(1)) {
        await assessment.answerQuestion(
          question.questionText,
          question.options[0].optionText,
        );
      }

      const submitResponse = studentPage.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes(`/api/assessments/${startData.assessmentId}/submit`),
      );
      await assessment.submit();
      const result = await responseData<AssessmentSubmitData>(await submitResponse);

      expect(result.status).toBe('GRADED');
      expect(result.assessmentId).toBe(startData.assessmentId);
      expect(result.skillResults).toHaveLength(context.requiredSkills.length);
      const e2eSkillResult = result.skillResults.find(
        (skillResult) => skillResult.skillId === context.skill.id,
      );
      expect(e2eSkillResult).toMatchObject({
        skillId: context.skill.id,
        skillName: context.skill.name,
      });
      expect(e2eSkillResult?.totalQuestions).toBeGreaterThan(0);
      await assessment.expectSkillResult(context.skill.name);

      const answers = startData.questions.map((question) => ({
        questionId: question.id,
        selectedOptionId: question.options[0].id,
      }));
      const duplicate = await studentApi.submitAssessmentRaw(
        startData.assessmentId,
        answers,
      );
      expect(duplicate.status).toBe(400);
      expect(JSON.stringify(duplicate.body)).toContain(
        'Assessment has already been submitted',
      );
      await expect(assessment.submitButton).toHaveCount(0);
    } finally {
      await restoreProfile(studentApi, originalProfile);
      await deactivateAssessmentContext(adminApi, context);
    }
  });

  test('shows a useful error when ACTIVE questions do not cover required levels', async ({
    studentPage,
    adminPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const originalProfile = await studentApi.getMyProfile();
    const context = await seedAssessmentContext(adminApi, [1], 2);
    const assessment = new AssessmentPage(studentPage);

    try {
      await studentApi.updateMyProfile({
        careerGoalId: context.careerGoal.id,
        specializationId: null,
      });
      await assessment.goto();
      await assessment.expectLoaded();
      await assessment.expectContext(context.careerGoal.name);
      await assessment.startButton.click();
      await assessment.expectStartError(/missing active questions for level\(s\): 2/i);
    } finally {
      await restoreProfile(studentApi, originalProfile);
      await deactivateAssessmentContext(adminApi, context);
    }
  });
});

interface AssessmentContext {
  category: ApiCatalogRecord;
  skill: ApiSkill;
  careerGoal: ApiCatalogRecord;
  requiredSkills: ApiCareerRequiredSkill[];
  cleanupRequiredSkills: ApiCareerRequiredSkill[];
  questions: ApiAssessmentQuestion[];
}

async function seedAssessmentContext(
  adminApi: AdminApiClient,
  questionLevels: number[],
  requiredLevel: number,
): Promise<AssessmentContext> {
  const marker = uniqueE2EName('Assessment');
  const category = await adminApi.createSkillCategory(`${marker}-Category`);
  const skill = await adminApi.createSkill(`${marker}-Skill`, category.id);
  const careerGoal = await adminApi.createCareerGoal(`${marker}-Career`);
  const commonRequiredSkills = await adminApi.listCareerRequiredSkills(
    careerGoal.id,
  );
  for (const commonRequiredSkill of commonRequiredSkills) {
    await adminApi.updateCareerRequiredSkill(
      careerGoal.id,
      commonRequiredSkill.id,
      { isRequired: false },
    );
  }
  const e2eRequiredSkill = await adminApi.createCareerRequiredSkill(
    careerGoal.id,
    skill.id,
    requiredLevel,
  );
  const requiredSkills = [e2eRequiredSkill];
  const questions: ApiAssessmentQuestion[] = [];
  for (const requiredSkill of requiredSkills) {
    const levels =
      requiredSkill.id === e2eRequiredSkill.id
        ? questionLevels
        : Array.from(
            { length: requiredSkill.requiredLevel },
            (_value, index) => index + 1,
          );
    for (const [index, level] of levels.entries()) {
      questions.push(
        await adminApi.createAssessmentQuestion(
          requiredSkill.skillId,
          `${marker}-${requiredSkill.skillId}-Question-${index + 1}`,
          level,
        ),
      );
    }
  }
  return {
    category,
    skill,
    careerGoal,
    requiredSkills,
    cleanupRequiredSkills: [...commonRequiredSkills, e2eRequiredSkill],
    questions,
  };
}

async function deactivateAssessmentContext(
  adminApi: AdminApiClient,
  context: AssessmentContext,
) {
  for (const question of context.questions) {
    await adminApi.deactivateQuestion(question.id);
  }
  for (const requiredSkill of context.cleanupRequiredSkills) {
    await adminApi.deleteCareerRequiredSkill(
      context.careerGoal.id,
      requiredSkill.id,
    );
  }
  await adminApi.deactivateCareerGoal(context.careerGoal.id);
  await adminApi.deactivateSkill(context.skill.id);
  await adminApi.deactivateSkillCategory(context.category.id);
}

async function restoreProfile(
  studentApi: ProfileApiClient,
  original: ApiStudentProfile,
) {
  await studentApi.updateMyProfile({
    careerGoalId: original.careerGoalId ?? null,
    specializationId: original.specializationId ?? null,
    summary: original.summary ?? null,
    githubUrl: original.githubUrl ?? null,
    linkedinUrl: original.linkedinUrl ?? null,
    portfolioUrl: original.portfolioUrl ?? null,
  });
}

async function responseData<T>(response: { json(): Promise<unknown> }) {
  return unwrapResponseData<T>(await response.json());
}

function unwrapResponseData<T>(body: unknown) {
  const response = body as { data?: T } & T;
  return (response.data ?? response) as T;
}
