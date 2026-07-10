import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { EvidencePage, StudentResourcePage } from '../pages';
import { ProfileApiClient, type ApiEvidence } from '../utils/profile-api';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Lecturer evidence review', () => {
  test('views pending evidence, verifies it, and student sees VERIFIED', async ({
    studentPage,
    lecturerPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    await ProfileApiClient.fromPage(lecturerPage, 'LECTURER');
    const projectName = uniqueE2EName('VerifyProject');
    const evidenceNote = uniqueE2EName('VerifyEvidence');
    await studentApi.createResource('projects', {
      title: projectName,
      description: 'E2E evidence verification resource',
    });

    await submitProjectEvidence(studentPage, projectName, evidenceNote);

    const reviewerEvidence = new EvidencePage(lecturerPage, 'lecturer');
    await reviewerEvidence.goto();
    await reviewerEvidence.expectLoaded();
    await reviewerEvidence.expectEvidenceStatus(evidenceNote, 'PENDING');
    await reviewerEvidence.verifyEvidence(evidenceNote);

    await expectStudentEvidence(studentApi, evidenceNote, 'VERIFIED');
    const studentEvidence = new EvidencePage(studentPage);
    await studentEvidence.goto();
    await studentEvidence.expectLoaded();
  });

  test('rejects pending evidence with a reason and student sees REJECTED', async ({
    studentPage,
    lecturerPage,
  }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    await ProfileApiClient.fromPage(lecturerPage, 'LECTURER');
    const projectName = uniqueE2EName('RejectProject');
    const evidenceNote = uniqueE2EName('RejectEvidence');
    const rejectionReason = `${uniqueE2EName('Reason')} proof is insufficient`;
    await studentApi.createResource('projects', {
      title: projectName,
      description: 'E2E evidence rejection resource',
    });

    await submitProjectEvidence(studentPage, projectName, evidenceNote);

    const reviewerEvidence = new EvidencePage(lecturerPage, 'lecturer');
    await reviewerEvidence.goto();
    await reviewerEvidence.expectLoaded();
    await reviewerEvidence.expectEvidenceStatus(evidenceNote, 'PENDING');
    await reviewerEvidence.rejectEvidence(evidenceNote, rejectionReason);

    await expectStudentEvidence(studentApi, evidenceNote, 'REJECTED', rejectionReason);
    const studentEvidence = new EvidencePage(studentPage);
    await studentEvidence.goto();
    await studentEvidence.expectLoaded();
  });
});

async function submitProjectEvidence(
  studentPage: Page,
  projectName: string,
  evidenceNote: string,
) {
  const projects = new StudentResourcePage(studentPage, 'projects');
  await projects.goto();
  await projects.expectLoaded();
  await projects.expectResource(projectName);
  await projects.uploadEvidence(
    projectName,
    'https://example.com/e2e/review-evidence',
    evidenceNote,
  );
}

async function expectStudentEvidence(
  studentApi: ProfileApiClient,
  note: string,
  status: ApiEvidence['status'],
  reviewerNote?: string,
) {
  await expect
    .poll(async () => Boolean(await studentApi.findEvidence(note, status)), {
      timeout: 15_000,
    })
    .toBe(true);

  const evidence = await studentApi.findEvidence(note, status);
  expect(evidence?.status).toBe(status);
  if (reviewerNote) {
    expect(evidence?.reviewerNote).toBe(reviewerNote);
  }
}
