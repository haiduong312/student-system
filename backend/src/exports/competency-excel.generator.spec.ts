import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AnalysisResultStatus,
  AnalysisSkillStatus,
  MatchLevel,
  Prisma,
  RoadmapPhase,
  StudentRecommendationStatus,
} from '@prisma/client';
import ExcelJS = require('exceljs');
import { CompetencyExcelGenerator } from './competency-excel.generator';

describe('CompetencyExcelGenerator', () => {
  it('creates overview, skill detail, and recommendation sheets', async () => {
    const analyzedAt = new Date('2026-06-15T02:30:00.000Z');
    const generator = new CompetencyExcelGenerator();
    const buffer = await generator.generate([
      {
        id: 'analysis-1',
        studentId: 'student-1',
        careerGoalId: 'goal-1',
        specializationId: 'specialization-1',
        completionPercent: new Prisma.Decimal('80.25'),
        matchPercent: new Prisma.Decimal('75.50'),
        riskScore: 20,
        matchLevel: MatchLevel.GOOD_MATCH,
        status: AnalysisResultStatus.CURRENT,
        analyzedAt,
        student: {
          studentCode: 'SV001',
          className: 'SE01',
          major: 'Software Engineering',
          user: {
            fullName: 'Student One',
            email: 'student.one@example.com',
          },
        },
        careerGoal: { name: 'Software Engineer' },
        specialization: { name: 'Backend Engineer' },
        details: [
          {
            id: 'detail-1',
            skillId: 'skill-1',
            currentLevel: 2,
            requiredLevel: 3,
            gap: 1,
            weight: new Prisma.Decimal('1.50'),
            achievedScore: new Prisma.Decimal('1.00'),
            priorityScore: new Prisma.Decimal('2.00'),
            status: AnalysisSkillStatus.NEED_IMPROVEMENT,
            skill: {
              name: 'NestJS',
              category: { name: 'Backend' },
            },
          },
        ],
        recommendations: [
          {
            id: 'recommendation-1',
            skillId: 'skill-1',
            roadmapPhase: RoadmapPhase.CAREER_TRACK,
            title: 'Build a NestJS project',
            description: 'Practice backend architecture',
            reason: 'Close the required level gap',
            priorityScore: new Prisma.Decimal('2.00'),
            status: StudentRecommendationStatus.NEW,
            createdAt: analyzedAt,
            updatedAt: analyzedAt,
            skill: { name: 'NestJS' },
          },
        ],
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const overview = workbook.getWorksheet('Tổng quan');
    const details = workbook.getWorksheet('Chi tiết kỹ năng');
    const recommendations = workbook.getWorksheet('Khuyến nghị');

    assert.ok(overview);
    assert.ok(details);
    assert.ok(recommendations);
    assert.equal(overview.getCell('B2').value, 'SV001');
    assert.equal(overview.getCell('I2').value, 80.25);
    assert.equal(overview.getCell('J2').value, 75.5);
    assert.equal(details.getCell('G2').value, 'NestJS');
    assert.equal(details.getCell('N2').value, AnalysisSkillStatus.NEED_IMPROVEMENT);
    assert.equal(recommendations.getCell('G2').value, 'Build a NestJS project');
    assert.equal(recommendations.getCell('L2').value, StudentRecommendationStatus.NEW);
  });
});
