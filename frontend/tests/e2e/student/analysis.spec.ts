import { expect, test } from '../fixtures';
import { AnalysisPage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { ProfileApiClient, type ApiAnalysis } from '../utils/profile-api';
import {
  cleanupWorkflowContext,
  createWorkflowContext,
} from '../utils/workflow-context';

test.describe('Competency analysis', () => {
  test.describe.configure({ timeout: 90_000 });

  test('shows core metrics and makes the previous result OBSOLETE after re-analysis', async ({
    studentPage,
    adminPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const context = await createWorkflowContext(adminApi, studentApi);
    const workflowSkill = context.skills[0];
    const analysisPage = new AnalysisPage(studentPage);

    try {
      await analysisPage.goto();
      await analysisPage.expectLoaded();

      const firstResponse = waitForAnalysisResponse(studentPage);
      await analysisPage.analyze();
      const firstAnalysis = await responseData<ApiAnalysis>(await firstResponse);

      expect(firstAnalysis.careerGoal).toBe(context.careerGoal.name);
      expect(firstAnalysis.completionPercent).toBeGreaterThanOrEqual(0);
      expect(firstAnalysis.matchPercent).toBeGreaterThanOrEqual(0);
      expect(firstAnalysis.riskScore).toBeGreaterThanOrEqual(0);
      expect(firstAnalysis.matchLevel).toBeTruthy();
      expect(firstAnalysis.skills).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            skillId: workflowSkill.skill.id,
            status: 'MISSING',
          }),
        ]),
      );

      await analysisPage.expectMetric(
        'Completion',
        `${firstAnalysis.completionPercent}%`,
      );
      await analysisPage.expectMetric('Match', `${firstAnalysis.matchPercent}%`);
      await analysisPage.expectMetric('Risk Score', String(firstAnalysis.riskScore));
      await analysisPage.expectMetric('Level', firstAnalysis.matchLevel);
      await analysisPage.expectSkill(workflowSkill.skill.name, 'MISSING');

      const secondResponse = waitForAnalysisResponse(studentPage);
      await analysisPage.analyze();
      const secondAnalysis = await responseData<ApiAnalysis>(await secondResponse);
      expect(secondAnalysis.analysisResultId).not.toBe(firstAnalysis.analysisResultId);

      await expect
        .poll(async () => {
          const history = await studentApi.listAnalysisHistory();
          return history
            .filter((item) => item.careerGoalId === context.careerGoal.id)
            .map((item) => item.status)
            .sort();
        })
        .toEqual(['CURRENT', 'OBSOLETE']);
      await analysisPage.expectHistoryLifecycle(context.careerGoal.name);
    } finally {
      await cleanupWorkflowContext(adminApi, studentApi, context);
    }
  });
});

function waitForAnalysisResponse(page: import('@playwright/test').Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/competency/analyze/me'),
  );
}

async function responseData<T>(response: { json(): Promise<unknown> }) {
  const body = (await response.json()) as { data?: T } & T;
  return (body.data ?? body) as T;
}
