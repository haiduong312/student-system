import { expect, test } from '../fixtures';
import { EvidencePage, StudentResourcePage } from '../pages';
import { ProfileApiClient } from '../utils/profile-api';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Student evidence submission', () => {
  test('submits URL evidence for a profile resource with PENDING status', async ({
    studentPage,
    lecturerPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const reviewerApi = await ProfileApiClient.fromPage(lecturerPage, 'LECTURER');
    const projectName = uniqueE2EName('EvidenceProject');
    const evidenceNote = uniqueE2EName('PendingEvidence');
    await studentApi.createResource('projects', {
      title: projectName,
      description: 'E2E resource used to submit pending evidence',
    });
    const projects = new StudentResourcePage(studentPage, 'projects');
    const evidences = new EvidencePage(studentPage);

    try {
      await projects.goto();
      await projects.expectLoaded();
      await projects.expectResource(projectName);
      await projects.uploadEvidence(
        projectName,
        'https://example.com/e2e/pending-evidence',
        evidenceNote,
      );
      await projects.expectVerification(projectName, 'PENDING');

      await evidences.goto();
      await evidences.expectLoaded();
      await evidences.expectEvidenceStatus(evidenceNote, 'PENDING');

      const pending = await studentApi.findEvidence(evidenceNote, 'PENDING');
      expect(pending?.relatedEntityType).toBe('PROJECT');
    } finally {
      const pending = await reviewerApi.findEvidence(evidenceNote, 'PENDING');
      if (pending) {
        await reviewerApi.rejectEvidence(
          pending.id,
          'E2E cleanup after pending evidence assertion',
        );
      }
    }
  });
});
