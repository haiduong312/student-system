import { test } from '../fixtures';
import {
  AdminStudentsPage,
  AssessmentPage,
  CatalogManagementPage,
  EvidencePage,
  LearningResourcePage,
  QuestionBankPage,
  RoadmapPage,
  StudentProfilePage,
} from '.';

test('admin page objects load their real routes', async ({ adminPage }) => {
  for (const kind of ['skill-categories', 'skills', 'career-goals'] as const) {
    const catalog = new CatalogManagementPage(adminPage, kind);
    await catalog.goto();
    await catalog.expectLoaded();
  }

  const questionBank = new QuestionBankPage(adminPage);
  await questionBank.goto();
  await questionBank.expectLoaded();

  const learningResources = new LearningResourcePage(adminPage);
  await learningResources.goto();
  await learningResources.expectLoaded();

  const students = new AdminStudentsPage(adminPage);
  await students.goto();
  await students.expectLoaded();
});

test('student page objects load their real routes', async ({ studentPage }) => {
  const pages = [
    new StudentProfilePage(studentPage),
    new AssessmentPage(studentPage),
    new EvidencePage(studentPage, 'student'),
    new RoadmapPage(studentPage),
  ];

  for (const pageObject of pages) {
    await pageObject.goto();
    await pageObject.expectLoaded();
  }
});

test('lecturer evidence page object loads its real route', async ({
  lecturerPage,
}) => {
  const evidences = new EvidencePage(lecturerPage, 'lecturer');
  await evidences.goto();
  await evidences.expectLoaded();
});
