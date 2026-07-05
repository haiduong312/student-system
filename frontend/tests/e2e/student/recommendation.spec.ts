import { expect, test } from '../fixtures';
import { RecommendationPage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { ProfileApiClient } from '../utils/profile-api';
import {
  cleanupWorkflowContext,
  createWorkflowContext,
} from '../utils/workflow-context';

test.describe('Student recommendations', () => {
  test.describe.configure({ timeout: 90_000 });
  test.use({ actionTimeout: 15_000 });

  test('shows generated recommendations and supports save, start, and dismiss', async ({
    studentPage,
    adminPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const context = await createWorkflowContext(adminApi, studentApi, 2);
    const [startedRecommendation, dismissedRecommendation] = context.skills;
    await studentApi.analyzeMine();
    const recommendations = new RecommendationPage(studentPage);

    try {
      await recommendations.goto();
      await recommendations.expectLoaded();
      await recommendations.expectRecommendation(
        startedRecommendation.recommendationTitle,
      );
      await recommendations.expectRecommendation(
        dismissedRecommendation.recommendationTitle,
      );

      await recommendations.updateStatus(
        startedRecommendation.recommendationTitle,
        'SAVED',
      );
      await recommendations.expectStatus(
        startedRecommendation.recommendationTitle,
        'SAVED',
      );
      await recommendations.updateStatus(
        startedRecommendation.recommendationTitle,
        'IN_PROGRESS',
      );
      await recommendations.expectStatus(
        startedRecommendation.recommendationTitle,
        'IN_PROGRESS',
      );

      await recommendations.updateStatus(
        dismissedRecommendation.recommendationTitle,
        'DISMISSED',
      );
      await expect
        .poll(async () =>
          (await studentApi.listRecommendations('DISMISSED')).some(
            (record) => record.skillId === dismissedRecommendation.skill.id,
          ),
        )
        .toBe(true);
      await recommendations.openTab('Dismissed');
      await recommendations.expectRecommendation(
        dismissedRecommendation.recommendationTitle,
      );
      await recommendations.expectStatus(
        dismissedRecommendation.recommendationTitle,
        'DISMISSED',
      );

      await expect
        .poll(async () => {
          const records = (
            await Promise.all([
              studentApi.listRecommendations('IN_PROGRESS'),
              studentApi.listRecommendations('DISMISSED'),
            ])
          ).flat();
          return records
            .filter((record) =>
              context.skills.some((skill) => skill.skill.id === record.skillId),
            )
            .map((record) => record.status)
            .sort();
        })
        .toEqual(['DISMISSED', 'IN_PROGRESS']);
    } finally {
      await cleanupWorkflowContext(adminApi, studentApi, context);
    }
  });
});
