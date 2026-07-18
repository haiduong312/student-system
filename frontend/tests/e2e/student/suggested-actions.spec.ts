import { expect, test } from '../fixtures';
import { AnalysisPage, RoadmapPage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { ProfileApiClient } from '../utils/profile-api';
import {
  cleanupWorkflowContext,
  createWorkflowContext,
} from '../utils/workflow-context';

test.describe('Student roadmap suggestions', () => {
  test.describe.configure({ timeout: 90_000 });
  test.use({ actionTimeout: 15_000 });

  test('reviews analysis suggestions and excludes an item while generating the next roadmap version', async ({
    studentPage,
    adminPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const context = await createWorkflowContext(adminApi, studentApi, 2);
    const [includedRecommendation, excludedRecommendation] = context.skills;
    await studentApi.analyzeMine();
    const analysis = new AnalysisPage(studentPage);
    const roadmap = new RoadmapPage(studentPage);

    try {
      await analysis.goto();
      await analysis.expectLoaded();
      await expect(
        studentPage.getByRole('menuitem', { name: 'Recommendations' }),
      ).toHaveCount(0);
      await analysis.expectSuggestedAction(
        includedRecommendation.recommendationTitle,
        {
          skill: includedRecommendation.skill.name,
          reason: /Current level \d\/\d; gap \d; priority score/,
          resourceCount: 0,
        },
      );
      await analysis.expectSuggestedAction(
        excludedRecommendation.recommendationTitle,
        {
          skill: excludedRecommendation.skill.name,
          reason: /Current level \d\/\d; gap \d; priority score/,
          resourceCount: 0,
        },
      );

      await roadmap.goto();
      await roadmap.expectLoaded();
      await roadmap.generate();
      const initialRoadmap = await studentApi.getActiveRoadmap();
      expect(initialRoadmap).not.toBeNull();
      expect(roadmapItemTitles(initialRoadmap!)).toEqual(
        expect.arrayContaining([
          includedRecommendation.recommendationTitle,
          excludedRecommendation.recommendationTitle,
        ]),
      );

      await roadmap.generate([excludedRecommendation.recommendationTitle]);
      await expect
        .poll(async () =>
          (await studentApi.listRecommendations('DISMISSED')).some(
            (record) => record.skillId === excludedRecommendation.skill.id,
          ),
        )
        .toBe(true);

      const nextRoadmap = await studentApi.getActiveRoadmap();
      expect(nextRoadmap).not.toBeNull();
      expect(roadmapItemTitles(nextRoadmap!)).toContain(
        includedRecommendation.recommendationTitle,
      );
      expect(roadmapItemTitles(nextRoadmap!)).not.toContain(
        excludedRecommendation.recommendationTitle,
      );

      await expect
        .poll(async () => {
          const records = (
            await Promise.all([
              studentApi.listRecommendations('NEW'),
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
        .toEqual(['DISMISSED', 'NEW']);
    } finally {
      await cleanupWorkflowContext(adminApi, studentApi, context);
    }
  });
});

function roadmapItemTitles(roadmap: {
  items?: Array<{ title: string }>;
  phases?: Array<{ items: Array<{ title: string }> }>;
}) {
  return [
    ...(roadmap.items ?? []),
    ...(roadmap.phases ?? []).flatMap((phase) => phase.items),
  ].map((item) => item.title);
}
