import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import type { CompetencyAnalysisExportRecord } from '../competency-analysis/competency-analysis.service';

@Injectable()
export class CompetencyExcelGenerator {
  async generate(results: CompetencyAnalysisExportRecord[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Digital Competency Profile';
    workbook.created = new Date();

    this.addOverviewSheet(workbook, results);
    this.addSkillDetailsSheet(workbook, results);
    this.addRecommendationsSheet(workbook, results);

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(workbookBuffer);
  }

  private addOverviewSheet(
    workbook: ExcelJS.Workbook,
    results: CompetencyAnalysisExportRecord[],
  ) {
    const worksheet = workbook.addWorksheet('Tổng quan', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = [
      { header: 'Mã kết quả', key: 'analysisId', width: 28 },
      { header: 'Mã sinh viên', key: 'studentCode', width: 18 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Lớp', key: 'className', width: 18 },
      { header: 'Ngành', key: 'major', width: 26 },
      { header: 'Mục tiêu nghề nghiệp', key: 'careerGoal', width: 28 },
      { header: 'Chuyên môn', key: 'specialization', width: 26 },
      { header: 'Hoàn thiện hồ sơ (%)', key: 'completionPercent', width: 20 },
      { header: 'Phù hợp (%)', key: 'matchPercent', width: 16 },
      { header: 'Điểm rủi ro', key: 'riskScore', width: 14 },
      { header: 'Mức phù hợp', key: 'matchLevel', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Thời điểm phân tích', key: 'analyzedAt', width: 22 },
    ];

    for (const result of results) {
      worksheet.addRow({
        analysisId: result.id,
        studentCode: result.student.studentCode,
        fullName: result.student.user.fullName,
        email: result.student.user.email,
        className: result.student.className ?? '',
        major: result.student.major ?? '',
        careerGoal: result.careerGoal.name,
        specialization: result.specialization?.name ?? '',
        completionPercent: Number(result.completionPercent),
        matchPercent: Number(result.matchPercent),
        riskScore: result.riskScore,
        matchLevel: result.matchLevel,
        status: result.status,
        analyzedAt: result.analyzedAt,
      });
    }

    worksheet.getColumn('completionPercent').numFmt = '0.00';
    worksheet.getColumn('matchPercent').numFmt = '0.00';
    worksheet.getColumn('analyzedAt').numFmt = 'dd/mm/yyyy hh:mm';
    this.styleSheet(worksheet, 'N');
  }

  private addSkillDetailsSheet(
    workbook: ExcelJS.Workbook,
    results: CompetencyAnalysisExportRecord[],
  ) {
    const worksheet = workbook.addWorksheet('Chi tiết kỹ năng', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = [
      { header: 'Mã kết quả', key: 'analysisId', width: 28 },
      { header: 'Mã sinh viên', key: 'studentCode', width: 18 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Mục tiêu nghề nghiệp', key: 'careerGoal', width: 28 },
      { header: 'Chuyên môn', key: 'specialization', width: 26 },
      { header: 'Nhóm kỹ năng', key: 'category', width: 24 },
      { header: 'Kỹ năng', key: 'skill', width: 28 },
      { header: 'Mức hiện tại', key: 'currentLevel', width: 14 },
      { header: 'Mức yêu cầu', key: 'requiredLevel', width: 14 },
      { header: 'Khoảng thiếu', key: 'gap', width: 14 },
      { header: 'Trọng số', key: 'weight', width: 12 },
      { header: 'Điểm đạt', key: 'achievedScore', width: 14 },
      { header: 'Điểm ưu tiên', key: 'priorityScore', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 20 },
    ];

    for (const result of results) {
      for (const detail of result.details) {
        worksheet.addRow({
          analysisId: result.id,
          studentCode: result.student.studentCode,
          fullName: result.student.user.fullName,
          careerGoal: result.careerGoal.name,
          specialization: result.specialization?.name ?? '',
          category: detail.skill.category?.name ?? '',
          skill: detail.skill.name,
          currentLevel: detail.currentLevel,
          requiredLevel: detail.requiredLevel,
          gap: detail.gap,
          weight: Number(detail.weight),
          achievedScore: Number(detail.achievedScore),
          priorityScore: Number(detail.priorityScore),
          status: detail.status,
        });
      }
    }

    worksheet.getColumn('weight').numFmt = '0.00';
    worksheet.getColumn('achievedScore').numFmt = '0.00';
    worksheet.getColumn('priorityScore').numFmt = '0.00';
    this.styleSheet(worksheet, 'N');
  }

  private addRecommendationsSheet(
    workbook: ExcelJS.Workbook,
    results: CompetencyAnalysisExportRecord[],
  ) {
    const worksheet = workbook.addWorksheet('Khuyến nghị', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = [
      { header: 'Mã kết quả', key: 'analysisId', width: 28 },
      { header: 'Mã sinh viên', key: 'studentCode', width: 18 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Mục tiêu nghề nghiệp', key: 'careerGoal', width: 28 },
      { header: 'Chuyên môn', key: 'specialization', width: 26 },
      { header: 'Kỹ năng', key: 'skill', width: 28 },
      { header: 'Tiêu đề', key: 'title', width: 32 },
      { header: 'Mô tả', key: 'description', width: 44 },
      { header: 'Lý do', key: 'reason', width: 44 },
      { header: 'Giai đoạn lộ trình', key: 'roadmapPhase', width: 24 },
      { header: 'Điểm ưu tiên', key: 'priorityScore', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 18 },
      { header: 'Ngày tạo', key: 'createdAt', width: 22 },
      { header: 'Ngày cập nhật', key: 'updatedAt', width: 22 },
    ];

    for (const result of results) {
      for (const recommendation of result.recommendations) {
        worksheet.addRow({
          analysisId: result.id,
          studentCode: result.student.studentCode,
          fullName: result.student.user.fullName,
          careerGoal: result.careerGoal.name,
          specialization: result.specialization?.name ?? '',
          skill: recommendation.skill.name,
          title: recommendation.title,
          description: recommendation.description ?? '',
          reason: recommendation.reason ?? '',
          roadmapPhase: recommendation.roadmapPhase ?? '',
          priorityScore: Number(recommendation.priorityScore),
          status: recommendation.status,
          createdAt: recommendation.createdAt,
          updatedAt: recommendation.updatedAt,
        });
      }
    }

    worksheet.getColumn('priorityScore').numFmt = '0.00';
    worksheet.getColumn('createdAt').numFmt = 'dd/mm/yyyy hh:mm';
    worksheet.getColumn('updatedAt').numFmt = 'dd/mm/yyyy hh:mm';
    this.styleSheet(worksheet, 'N');
  }

  private styleSheet(worksheet: ExcelJS.Worksheet, lastColumn: string) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.autoFilter = { from: 'A1', to: `${lastColumn}1` };
  }
}
