import { expect, test } from '../fixtures';
import { QuestionBankPage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Admin assessment question bank', () => {
  test('creates, filters, edits, and deactivates an active question with options', async ({
    adminPage,
  }) => {
    const api = await AdminApiClient.fromPage(adminPage);
    const activeSkills = await api.listSkills({ status: 'ACTIVE', limit: 100 });
    expect(activeSkills.length).toBeGreaterThan(0);
    const skill = activeSkills[0];
    const skillOption = `${skill.name} (${skill.type})`;
    const questionText = `${uniqueE2EName('Question')} initial?`;
    const updatedQuestionText = `${questionText} updated`;
    const options = [
      { text: `${uniqueE2EName('Option')} A` },
      { text: `${uniqueE2EName('Option')} B`, correct: true },
      { text: `${uniqueE2EName('Option')} C` },
    ];
    const questionBank = new QuestionBankPage(adminPage);
    let scenarioCompleted = false;

    try {
      await questionBank.goto();
      await questionBank.expectLoaded();

      const emptyForm = await questionBank.openCreateForm();
      await questionBank.expectRequiredValidation(emptyForm);
      await questionBank.cancelDialog(emptyForm);

      await questionBank.create({
        skill: skillOption,
        question: questionText,
        questionType: 'SINGLE_CHOICE',
        level: 1,
        status: 'ACTIVE',
        explanation: 'E2E assessment question explanation',
        options,
      });

      await questionBank.search(questionText);
      await questionBank.expectQuestion(questionText);
      await questionBank.expectQuestionStatus(questionText, 'ACTIVE');
      await questionBank.filter({
        skill: skillOption,
        skillType: skill.type,
        level: 'Level 1',
        questionType: 'SINGLE_CHOICE',
        status: 'ACTIVE',
      });
      await questionBank.expectQuestion(questionText);

      await questionBank.update(questionText, {
        skill: skillOption,
        question: updatedQuestionText,
        level: 1,
        status: 'ACTIVE',
        explanation: 'E2E updated assessment question explanation',
      });
      await questionBank.goto();
      await questionBank.search(updatedQuestionText);
      await questionBank.expectQuestionStatus(updatedQuestionText, 'ACTIVE');

      const activeQuestion = await api.findQuestion(
        updatedQuestionText,
        'ACTIVE',
      );
      expect(activeQuestion).toBeDefined();
      expect(activeQuestion?.skillId).toBe(skill.id);
      expect(activeQuestion?.questionType).toBe('SINGLE_CHOICE');
      expect(activeQuestion?.options).toHaveLength(options.length);
      expect(
        activeQuestion?.options.filter((option) => option.isCorrect),
      ).toHaveLength(1);
      expect(
        activeQuestion?.options.find((option) => option.isCorrect)?.optionText,
      ).toBe(options[1].text);

      // ACTIVE + valid options + skill binding are the eligibility conditions
      // used by the assessment generator when selecting question candidates.
      const eligibleQuestions = await api.listQuestions({
        search: updatedQuestionText,
        skillId: skill.id,
        status: 'ACTIVE',
        level: 1,
      });
      expect(
        eligibleQuestions.some(
          (question) => question.questionText === updatedQuestionText,
        ),
      ).toBe(true);

      await questionBank.delete(updatedQuestionText);
      await questionBank.goto();
      await questionBank.search(updatedQuestionText);
      await questionBank.filter({ status: 'INACTIVE' });
      await questionBank.expectQuestionStatus(updatedQuestionText, 'INACTIVE');
      scenarioCompleted = true;
    } finally {
      try {
        const activeQuestion =
          (await api.findQuestion(updatedQuestionText, 'ACTIVE')) ??
          (await api.findQuestion(questionText, 'ACTIVE'));
        if (activeQuestion) await api.deactivateQuestion(activeQuestion.id);
      } catch (error) {
        if (scenarioCompleted) throw error;
      }
    }
  });
});
