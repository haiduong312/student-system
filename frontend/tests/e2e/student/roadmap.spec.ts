import { expect, test } from '../fixtures';
import { RoadmapPage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { ProfileApiClient, type ApiRoadmap } from '../utils/profile-api';
import {
  cleanupWorkflowContext,
  createWorkflowContext,
} from '../utils/workflow-context';

test.describe('Student development roadmap', () => {
  test.describe.configure({ timeout: 90_000 });

  test('generates ordered roadmap items and updates completion progress', async ({
    studentPage,
    adminPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const context = await createWorkflowContext(adminApi, studentApi);
    const workflowSkill = context.skills[0];
    await studentApi.analyzeMine();
    const roadmapPage = new RoadmapPage(studentPage);

    try {
      await roadmapPage.goto();
      await roadmapPage.expectLoaded();
      await roadmapPage.generate();
      await roadmapPage.expectItem(workflowSkill.recommendationTitle, {
        order: 1,
        phase: 'CAREER_TRACK',
        status: 'TODO',
      });
      await roadmapPage.expectProgress(0);

      await roadmapPage.updateItemStatus(
        workflowSkill.recommendationTitle,
        'IN_PROGRESS',
      );
      await roadmapPage.expectItem(workflowSkill.recommendationTitle, {
        status: 'IN_PROGRESS',
      });

      const completionResponse = studentPage.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          response.url().includes('/api/roadmaps/items/'),
      );
      await roadmapPage.updateItemStatus(
        workflowSkill.recommendationTitle,
        'DONE',
      );
      const completedRoadmap = await responseData<ApiRoadmap>(
        await completionResponse,
      );
      const completedItems = [
        ...(completedRoadmap.items ?? []),
        ...(completedRoadmap.phases ?? []).flatMap((phase) => phase.items),
      ];
      expect(completedRoadmap.status).toBe('COMPLETED');
      expect(Number(completedRoadmap.progressPercent)).toBe(100);
      expect(
        completedItems.find((item) => item.title === workflowSkill.recommendationTitle)
          ?.status,
      ).toBe('DONE');

      await expect.poll(() => studentApi.getActiveRoadmap()).toBeNull();
      await roadmapPage.expectHistory(completedRoadmap.title, 'COMPLETED', 100);
    } finally {
      await cleanupWorkflowContext(adminApi, studentApi, context);
    }
  });
});

async function responseData<T>(response: { json(): Promise<unknown> }) {
  const body = (await response.json()) as { data?: T } & T;
  return (body.data ?? body) as T;
}
