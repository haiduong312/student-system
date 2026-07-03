import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AnalysisResultStatus,
  EvidenceEntityType,
  EvidenceStatus,
  MatchLevel,
  Prisma,
  RoadmapItemStatus,
  RoadmapItemType,
  RoadmapPhase,
  RoadmapStatus,
  SkillType,
  StudentRecommendationStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import type { StudentPortfolioSnapshot } from '../students/students.service';
import { ExportPortfolioDto } from './dto/export-portfolio.dto';
import { StudentPortfolioPdfGenerator } from './student-portfolio-pdf.generator';

export function createPortfolioSnapshotFixture(): StudentPortfolioSnapshot {
  const now = new Date('2026-07-03T02:30:00.000Z');
  return {
    id: 'student-1',
    studentCode: 'SV001',
    className: 'SE01',
    major: 'Kỹ thuật phần mềm',
    academicYear: '2024-2028',
    phone: '0900000000',
    dateOfBirth: new Date('2005-01-02T00:00:00.000Z'),
    avatarUrl: null,
    user: {
      fullName: 'Nguyễn Văn An',
      email: 'an@example.com',
      status: UserStatus.ACTIVE,
    },
    profile: {
      summary: 'Sinh viên định hướng phát triển năng lực backend và điện toán đám mây.',
      githubUrl: 'https://github.com/example',
      linkedinUrl: null,
      portfolioUrl: null,
      completionPercent: new Prisma.Decimal('80.00'),
      matchPercent: new Prisma.Decimal('75.00'),
      riskScore: 20,
      lastAnalyzedAt: now,
      careerGoal: { name: 'Kỹ sư phần mềm' },
      specialization: { name: 'Backend Engineer' },
    },
    skills: [
      {
        currentLevel: 2,
        description: 'Đã xây dựng API bằng NestJS.',
        evidenceStatus: VerificationStatus.VERIFIED,
        verifiedAt: now,
        skill: {
          name: 'NestJS',
          type: SkillType.CAREER_SPECIFIC,
          category: { name: 'Backend' },
        },
      },
    ],
    evidences: [
      {
        relatedEntityType: EvidenceEntityType.SKILL,
        fileUrl: '/api/uploads/evidence.pdf',
        evidenceUrl: 'https://example.com/project',
        note: 'Minh chứng dự án cuối kỳ.',
        status: EvidenceStatus.VERIFIED,
        reviewedAt: now,
        createdAt: now,
      },
    ],
    analysisResults: [
      {
        id: 'analysis-1',
        completionPercent: new Prisma.Decimal('80.00'),
        matchPercent: new Prisma.Decimal('75.00'),
        riskScore: 20,
        matchLevel: MatchLevel.GOOD_MATCH,
        status: AnalysisResultStatus.CURRENT,
        analyzedAt: now,
        careerGoal: { name: 'Kỹ sư phần mềm' },
        specialization: { name: 'Backend Engineer' },
        recommendations: [
          {
            title: 'Hoàn thiện dự án backend',
            description: 'Xây dựng API có kiểm thử và tài liệu.',
            reason: 'Cần nâng mức kỹ năng triển khai.',
            roadmapPhase: RoadmapPhase.PRACTICE_PROJECT,
            priorityScore: new Prisma.Decimal('2.00'),
            status: StudentRecommendationStatus.NEW,
            skill: { name: 'NestJS' },
          },
        ],
      },
    ],
    roadmaps: [
      {
        title: 'Lộ trình Backend Engineer',
        description: 'Lộ trình phát triển kỹ năng backend.',
        version: 1,
        progressPercent: new Prisma.Decimal('30.00'),
        status: RoadmapStatus.ACTIVE,
        createdAt: now,
        careerGoal: { name: 'Kỹ sư phần mềm' },
        specialization: { name: 'Backend Engineer' },
        items: [
          {
            title: 'Xây dựng REST API',
            description: 'Hoàn thiện API và bộ unit test.',
            itemType: RoadmapItemType.PROJECT,
            roadmapPhase: RoadmapPhase.PRACTICE_PROJECT,
            deadline: new Date('2026-08-01T00:00:00.000Z'),
            status: RoadmapItemStatus.IN_PROGRESS,
            skill: { name: 'NestJS' },
          },
        ],
      },
    ],
  };
}

describe('StudentPortfolioPdfGenerator', () => {
  it('creates a valid PDF buffer with Vietnamese portfolio data', async () => {
    const generator = new StudentPortfolioPdfGenerator();
    const buffer = await generator.generate(
      createPortfolioSnapshotFixture(),
      new ExportPortfolioDto(),
    );

    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    assert.ok(buffer.length > 5_000);
  });

  it('supports selecting a safe subset of portfolio sections', async () => {
    const generator = new StudentPortfolioPdfGenerator();
    const input = Object.assign(new ExportPortfolioDto(), {
      sections: ['profile', 'skills'] as const,
      privacy: { phone: false, dateOfBirth: false },
    });
    const buffer = await generator.generate(createPortfolioSnapshotFixture(), input);

    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  });
});
