import {
  AnalysisResultStatus,
  AssignmentStatus,
  EvidenceStatus,
  RoadmapStatus,
} from '@prisma/client';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DashboardService } from './dashboard.service';

describe('DashboardService specialization scope', () => {
  it('loads student analysis and roadmap only from the current specialization scope', async () => {
    let analysisWhere: any;
    let roadmapWhere: any;
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
          completionPercent: 50,
          matchPercent: null,
          careerGoal: { id: 'goal-1', name: 'Software Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async ({ where }: any) => {
          analysisWhere = where;
          if (where.specializationId !== 'backend-1') {
            return {
              matchPercent: 10,
              details: [],
            };
          }

          return {
            matchPercent: 80,
            details: [],
          };
        },
      },
      developmentRoadmap: {
        findFirst: async ({ where }: any) => {
          roadmapWhere = where;
          return {
            id: 'roadmap-1',
            progressPercent: 25,
            status: RoadmapStatus.ACTIVE,
            _count: { items: 2 },
          };
        },
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.deepEqual(analysisWhere, {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
      status: AnalysisResultStatus.CURRENT,
    });
    assert.deepEqual(roadmapWhere, {
      studentId: 'student-1',
      careerGoalId: 'goal-1',
      specializationId: 'backend-1',
      status: RoadmapStatus.ACTIVE,
    });
    assert.equal(result.matchPercent, 80);
    assert.equal(result.roadmapProgress.roadmapId, 'roadmap-1');
  });

  it('uses the updated profile context instead of old current analysis and active roadmap data', async () => {
    const analyses = [
      {
        id: 'analysis-old',
        studentId: 'student-1',
        careerGoalId: 'goal-old',
        specializationId: 'spec-old',
        status: AnalysisResultStatus.CURRENT,
        matchPercent: 20,
        details: [],
      },
      {
        id: 'analysis-new',
        studentId: 'student-1',
        careerGoalId: 'goal-new',
        specializationId: 'spec-new',
        status: AnalysisResultStatus.CURRENT,
        matchPercent: 88,
        details: [],
      },
    ];
    const roadmaps = [
      {
        id: 'roadmap-old',
        studentId: 'student-1',
        careerGoalId: 'goal-old',
        specializationId: 'spec-old',
        status: RoadmapStatus.ACTIVE,
        progressPercent: 12,
        _count: { items: 1 },
      },
      {
        id: 'roadmap-new',
        studentId: 'student-1',
        careerGoalId: 'goal-new',
        specializationId: 'spec-new',
        status: RoadmapStatus.ACTIVE,
        progressPercent: 45,
        _count: { items: 3 },
      },
    ];
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-new',
          specializationId: 'spec-new',
          completionPercent: 65,
          matchPercent: null,
          careerGoal: { id: 'goal-new', name: 'Data Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async ({ where }: any) =>
          analyses.find(
            (analysis) =>
              analysis.studentId === where.studentId &&
              analysis.careerGoalId === where.careerGoalId &&
              analysis.specializationId === where.specializationId &&
              analysis.status === where.status,
          ) ?? null,
      },
      developmentRoadmap: {
        findFirst: async ({ where }: any) =>
          roadmaps.find(
            (roadmap) =>
              roadmap.studentId === where.studentId &&
              roadmap.careerGoalId === where.careerGoalId &&
              roadmap.specializationId === where.specializationId &&
              roadmap.status === where.status,
          ) ?? null,
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.equal(result.matchPercent, 88);
    assert.equal(result.careerGoal?.id, 'goal-new');
    assert.equal(result.roadmapProgress.roadmapId, 'roadmap-new');
    assert.equal(result.roadmapProgress.progressPercent, 45);
    assert.equal(result.roadmapProgress.itemCount, 3);
  });

  it('does not use OBSOLETE analysis data for the current dashboard scope', async () => {
    const analyses = [
      {
        id: 'analysis-obsolete',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.OBSOLETE,
        matchPercent: 15,
        details: [],
      },
      {
        id: 'analysis-current',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: AnalysisResultStatus.CURRENT,
        matchPercent: 92,
        details: [],
      },
    ];
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
          completionPercent: 75,
          matchPercent: null,
          careerGoal: { id: 'goal-1', name: 'Software Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async ({ where }: any) =>
          analyses.find(
            (analysis) =>
              analysis.studentId === where.studentId &&
              analysis.careerGoalId === where.careerGoalId &&
              analysis.specializationId === where.specializationId &&
              analysis.status === where.status,
          ) ?? null,
      },
      developmentRoadmap: {
        findFirst: async () => null,
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.equal(result.matchPercent, 92);
  });

  it('does not treat archived, cancelled, or completed roadmaps as active dashboard roadmaps', async () => {
    const roadmaps = [
      {
        id: 'roadmap-archived',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: RoadmapStatus.ARCHIVED,
        progressPercent: 20,
        _count: { items: 2 },
      },
      {
        id: 'roadmap-cancelled',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: RoadmapStatus.CANCELLED,
        progressPercent: 30,
        _count: { items: 3 },
      },
      {
        id: 'roadmap-completed',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'backend-1',
        status: RoadmapStatus.COMPLETED,
        progressPercent: 100,
        _count: { items: 4 },
      },
    ];
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'backend-1',
          completionPercent: 75,
          matchPercent: 80,
          careerGoal: { id: 'goal-1', name: 'Software Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async () => null,
      },
      developmentRoadmap: {
        findFirst: async ({ where }: any) =>
          roadmaps.find(
            (roadmap) =>
              roadmap.studentId === where.studentId &&
              roadmap.careerGoalId === where.careerGoalId &&
              roadmap.specializationId === where.specializationId &&
              roadmap.status === where.status,
          ) ?? null,
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.equal(result.roadmapProgress.roadmapId, null);
    assert.equal(result.roadmapProgress.progressPercent, 0);
    assert.equal(result.roadmapProgress.status, null);
    assert.equal(result.roadmapProgress.itemCount, 0);
  });

  it('stays on the latest profile context after multiple career goal and specialization changes', async () => {
    const analyses = [
      {
        id: 'analysis-first',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'spec-1',
        status: AnalysisResultStatus.CURRENT,
        matchPercent: 20,
        details: [],
      },
      {
        id: 'analysis-second',
        studentId: 'student-1',
        careerGoalId: 'goal-2',
        specializationId: 'spec-2',
        status: AnalysisResultStatus.CURRENT,
        matchPercent: 55,
        details: [],
      },
      {
        id: 'analysis-latest',
        studentId: 'student-1',
        careerGoalId: 'goal-3',
        specializationId: 'spec-3',
        status: AnalysisResultStatus.CURRENT,
        matchPercent: 91,
        details: [],
      },
    ];
    const roadmaps = [
      {
        id: 'roadmap-first',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'spec-1',
        status: RoadmapStatus.ACTIVE,
        progressPercent: 10,
        _count: { items: 1 },
      },
      {
        id: 'roadmap-second',
        studentId: 'student-1',
        careerGoalId: 'goal-2',
        specializationId: 'spec-2',
        status: RoadmapStatus.ACTIVE,
        progressPercent: 40,
        _count: { items: 2 },
      },
      {
        id: 'roadmap-latest',
        studentId: 'student-1',
        careerGoalId: 'goal-3',
        specializationId: 'spec-3',
        status: RoadmapStatus.ACTIVE,
        progressPercent: 70,
        _count: { items: 5 },
      },
    ];
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-3',
          specializationId: 'spec-3',
          completionPercent: 82,
          matchPercent: null,
          careerGoal: { id: 'goal-3', name: 'AI Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async ({ where }: any) =>
          analyses.find(
            (analysis) =>
              analysis.studentId === where.studentId &&
              analysis.careerGoalId === where.careerGoalId &&
              analysis.specializationId === where.specializationId &&
              analysis.status === where.status,
          ) ?? null,
      },
      developmentRoadmap: {
        findFirst: async ({ where }: any) =>
          roadmaps.find(
            (roadmap) =>
              roadmap.studentId === where.studentId &&
              roadmap.careerGoalId === where.careerGoalId &&
              roadmap.specializationId === where.specializationId &&
              roadmap.status === where.status,
          ) ?? null,
      },
      studentRecommendation: {
        findMany: async () => {
          throw new Error('student dashboard does not read recommendations');
        },
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.equal(result.careerGoal?.id, 'goal-3');
    assert.equal(result.matchPercent, 91);
    assert.equal(result.roadmapProgress.roadmapId, 'roadmap-latest');
    assert.equal(result.roadmapProgress.progressPercent, 70);
    assert.equal(result.roadmapProgress.itemCount, 5);
  });

  it('does not reuse obsolete analysis or archived roadmap after a catalog invalidation', async () => {
    const service = new DashboardService({
      student: {
        findUnique: async () => ({ id: 'student-1' }),
      },
      studentProfile: {
        findUnique: async () => ({
          studentId: 'student-1',
          careerGoalId: 'goal-1',
          specializationId: 'spec-1',
          completionPercent: 80,
          matchPercent: null,
          careerGoal: { id: 'goal-1', name: 'Software Engineer' },
        }),
      },
      competencyAnalysisResult: {
        findFirst: async ({ where }: any) =>
          where.status === AnalysisResultStatus.CURRENT
            ? null
            : {
                id: 'analysis-invalidated',
                matchPercent: 98,
                status: AnalysisResultStatus.OBSOLETE,
                details: [],
              },
      },
      developmentRoadmap: {
        findFirst: async ({ where }: any) =>
          where.status === RoadmapStatus.ACTIVE
            ? null
            : {
                id: 'roadmap-invalidated',
                status: RoadmapStatus.ARCHIVED,
                progressPercent: 99,
                _count: { items: 9 },
              },
      },
    } as any);

    const result = await service.getStudentDashboard('user-1');

    assert.equal(result.matchPercent, 0);
    assert.equal(result.roadmapProgress.roadmapId, null);
    assert.equal(result.roadmapProgress.progressPercent, 0);
  });
});

describe('DashboardService evidence summaries', () => {
  it('counts only pending evidence for active lecturer assignments', async () => {
    let pendingEvidenceWhere: any;
    const service = new DashboardService({
      lecturer: {
        findUnique: async () => ({ id: 'lecturer-1' }),
      },
      student: {
        count: async ({ where }: any) =>
          where.profile ? 2 : 8,
      },
      evidence: {
        count: async ({ where }: any) => {
          pendingEvidenceWhere = where;
          return 3;
        },
      },
    } as any);

    const result = await service.getLecturerDashboard('lecturer-user-1');

    assert.equal(result.pendingEvidence, 3);
    assert.deepEqual(pendingEvidenceWhere, {
      status: EvidenceStatus.PENDING,
      student: {
        advisorAssignments: {
          some: {
            lecturerId: 'lecturer-1',
            status: AssignmentStatus.ACTIVE,
          },
        },
      },
    });
  });
});
