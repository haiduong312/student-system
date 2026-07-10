import { expect, test } from '../fixtures';
import {
  AdvisorReviewsPage,
  EvidencePage,
  LecturerDashboardPage,
  LecturerStudentsPage,
} from '../pages';
import {
  AdminApiClient,
  type ApiAdvisorAssignmentSnapshot,
  type ApiStudent,
} from '../utils/admin-api';
import { ProfileApiClient } from '../utils/profile-api';
import { uniqueE2EName } from '../utils/test-data';
import { getRoleCredentials, type RoleCredentials } from '../utils/test-env';
import {
  cleanupWorkflowContext,
  createWorkflowContext,
  type WorkflowContext,
} from '../utils/workflow-context';

test.describe('Lecturer advisor flow', () => {
  test.describe.configure({ timeout: 180_000 });

  test('scopes assigned students, reviews evidence, and creates advisor review', async ({
    adminPage,
    studentPage,
    lecturerPage,
  }) => {
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const lecturerApi = await ProfileApiClient.fromPage(lecturerPage, 'LECTURER');
    const lecturerCredentials = getRoleCredentials('LECTURER');
    const lecturer = await adminApi.findLecturerByEmail(lecturerCredentials.email);
    expect(lecturer, `Missing lecturer test account ${lecturerCredentials.email}`).toBeTruthy();

    const marker = uniqueE2EName('AdvisorFlow');
    const assignedCredentials = createStudentCredentials(marker, 'assigned');
    const inactiveCredentials = createStudentCredentials(marker, 'inactive');
    const assignedPayload = createStudentPayload(marker, 'assigned', assignedCredentials);
    const inactivePayload = createStudentPayload(marker, 'inactive', inactiveCredentials);
    const summary = `${marker} advisor-visible profile summary`;
    const projectName = `${marker}-Project`;
    const evidenceNote = `${marker}-Evidence`;
    const reviewContent = `${marker} advisor review content`;
    const reviewSuggestion = `${marker} advisor review suggestion`;

    let assignedStudent: ApiStudent | undefined;
    let inactiveStudent: ApiStudent | undefined;
    let activeAssignment: ApiAdvisorAssignmentSnapshot | undefined;
    let inactiveAssignment: ApiAdvisorAssignmentSnapshot | undefined;
    let workflowContext: WorkflowContext | undefined;
    let assignedStudentApi: ProfileApiClient | undefined;

    try {
      assignedStudent = await adminApi.createStudent(assignedPayload);
      inactiveStudent = await adminApi.createStudent(inactivePayload);
      activeAssignment = await adminApi.ensureAdvisorAssignment(
        lecturer!.id,
        assignedStudent.id,
        'ACTIVE',
      );
      inactiveAssignment = await adminApi.ensureAdvisorAssignment(
        lecturer!.id,
        inactiveStudent.id,
        'INACTIVE',
      );

      assignedStudentApi = await ProfileApiClient.fromCredentials(
        studentPage,
        assignedCredentials,
      );
      workflowContext = await createWorkflowContext(adminApi, assignedStudentApi);
      await assignedStudentApi.updateMyProfile({
        careerGoalId: workflowContext.careerGoal.id,
        specializationId: null,
        summary,
        githubUrl: 'https://github.com/e2e-advisor-flow',
        linkedinUrl: 'https://www.linkedin.com/in/e2e-advisor-flow',
        portfolioUrl: 'https://example.com/e2e-advisor-flow',
      });
      const [workflowSkill] = workflowContext.skills;
      await assignedStudentApi.analyzeMine();
      const project = await assignedStudentApi.createResource('projects', {
        title: projectName,
        description: `${marker} project for advisor evidence review`,
        roleInProject: 'Owner',
        technologies: ['Playwright', 'E2E'],
        status: 'IN_PROGRESS',
      });
      await assignedStudentApi.uploadEvidence('projects', project.id, {
        evidenceUrl: 'https://example.com/e2e/advisor-flow-evidence',
        note: evidenceNote,
      });

      const dashboard = new LecturerDashboardPage(lecturerPage);
      await dashboard.goto();
      await dashboard.expectLoaded();
      await dashboard.goToAssignedStudents();

      const students = new LecturerStudentsPage(lecturerPage);
      await students.expectLoaded();
      await students.search(assignedPayload.fullName);
      await students.expectStudentVisible(assignedPayload.fullName);
      await students.search(inactivePayload.fullName);
      await students.expectStudentNotVisible(inactivePayload.fullName);
      await students.search(assignedPayload.fullName);
      await students.openStudentDetails(assignedPayload.fullName);
      await students.expectOverview({
        fullName: assignedPayload.fullName,
        email: assignedPayload.email,
        studentCode: assignedPayload.studentCode,
        careerGoalName: workflowContext.careerGoal.name,
        summary,
      });
      await students.expectAnalysisMetrics();
      await students.expectResource('Skills', workflowSkill.skill.name);
      await students.expectResource('Projects', projectName, 'PENDING');
      await students.closeDetails();

      await dashboard.goToEvidenceReview();
      const evidence = new EvidencePage(lecturerPage, 'lecturer');
      await evidence.expectLoaded();
      await evidence.expectEvidenceStatus(evidenceNote, 'PENDING');
      await evidence.verifyEvidence(evidenceNote);
      await expect
        .poll(async () =>
          Boolean(await assignedStudentApi?.findEvidence(evidenceNote, 'VERIFIED')),
        )
        .toBe(true);

      await students.goto();
      await students.expectLoaded();
      await students.search(assignedPayload.fullName);
      await students.openStudentDetails(assignedPayload.fullName);
      await students.expectResource('Projects', projectName, 'VERIFIED');
      await students.closeDetails();

      await dashboard.goToAdvisorReviews();
      const reviews = new AdvisorReviewsPage(lecturerPage);
      await reviews.expectLoaded();
      await reviews.selectAssignedStudent({
        fullName: assignedPayload.fullName,
        studentCode: assignedPayload.studentCode,
        className: assignedPayload.className,
      });
      await reviews.createReview(reviewContent, reviewSuggestion);
      await reviews.expectReview(reviewContent);
      await reviews.openReviewDetails(reviewContent);
      await reviews.expectReviewDetails(reviewContent, reviewSuggestion);

      const forbiddenDetail = await lecturerApi.getStatus(`/students/${inactiveStudent.id}`);
      expect(forbiddenDetail.status).toBe(403);
      const forbiddenReview = await lecturerApi.postStatus(
        `/advisor-reviews/students/${inactiveStudent.id}`,
        {
          reviewContent: `${marker} forbidden review`,
          suggestion: null,
          rating: null,
        },
      );
      expect(forbiddenReview.status).toBe(403);
    } finally {
      if (workflowContext && assignedStudentApi) {
        await cleanupWorkflowContext(adminApi, assignedStudentApi, workflowContext);
      }
      await adminApi.restoreAdvisorAssignment(activeAssignment);
      await adminApi.restoreAdvisorAssignment(inactiveAssignment);
      if (assignedStudent) await adminApi.deactivateStudent(assignedStudent.id);
      if (inactiveStudent) await adminApi.deactivateStudent(inactiveStudent.id);
    }
  });
});

function createStudentCredentials(marker: string, kind: 'assigned' | 'inactive'): RoleCredentials {
  return {
    email: `${marker.toLowerCase()}-${kind}@example.com`,
    password: `${marker}-${kind}-Pass1`,
  };
}

function createStudentPayload(
  marker: string,
  kind: 'assigned' | 'inactive',
  credentials: RoleCredentials,
) {
  const label = kind === 'assigned' ? 'Assigned' : 'Inactive';
  return {
    email: credentials.email,
    password: credentials.password,
    fullName: `${marker} ${label} Student`,
    studentCode: `E2E-${kind.toUpperCase()}-${marker}`,
    className: 'E2E Advisor',
    major: 'Digital Competency',
    academicYear: '2026',
  };
}
