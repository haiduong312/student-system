import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import type { StudentPortfolioSnapshot } from '../students/students.service';
import {
  ExportPortfolioDto,
  PORTFOLIO_SECTIONS,
  PortfolioSection,
} from './dto/export-portfolio.dto';

const FONT_REGULAR = require.resolve(
  '@digabi/noto-sans/WOFF/NotoSans-Regular.woff',
);
const FONT_BOLD = require.resolve('@digabi/noto-sans/WOFF/NotoSans-Bold.woff');
const REGULAR_FONT = 'NotoSans';
const BOLD_FONT = 'NotoSansBold';
const PRIMARY_COLOR = '#1F4E78';
const MUTED_COLOR = '#52606D';
const LIGHT_COLOR = '#EAF2F8';

@Injectable()
export class StudentPortfolioPdfGenerator {
  async generate(
    snapshot: StudentPortfolioSnapshot,
    input: ExportPortfolioDto = new ExportPortfolioDto(),
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const document = new PDFDocument({
        size: 'A4',
        margins: { top: 56, right: 48, bottom: 54, left: 48 },
        bufferPages: true,
        info: {
          Title: `Portfolio - ${snapshot.user.fullName}`,
          Author: snapshot.user.fullName,
          Subject: 'Student digital competency portfolio',
          CreationDate: new Date(),
        },
      });

      document.registerFont(REGULAR_FONT, FONT_REGULAR);
      document.registerFont(BOLD_FONT, FONT_BOLD);
      document.font(REGULAR_FONT);
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.on('pageAdded', () => this.drawPageHeader(document, snapshot));

      try {
        this.render(document, snapshot, input);
        this.drawPageNumbers(document);
        document.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private render(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
    input: ExportPortfolioDto,
  ) {
    const sections = new Set<PortfolioSection>(
      input.sections ?? PORTFOLIO_SECTIONS,
    );

    this.drawTitle(document, snapshot);
    this.drawStudentIdentity(document, snapshot, input);

    if (sections.has('profile')) {
      this.drawProfile(document, snapshot, input);
    }
    if (sections.has('skills')) {
      this.drawSkills(document, snapshot);
    }
    if (sections.has('evidences')) {
      this.drawEvidences(document, snapshot, input);
    }
    if (sections.has('analysis')) {
      this.drawLatestAnalysis(document, snapshot);
    }
    if (sections.has('recommendations')) {
      this.drawRecommendations(document, snapshot);
    }
    if (sections.has('roadmap')) {
      this.drawRoadmap(document, snapshot);
    }

    document
      .moveDown(1.5)
      .font(REGULAR_FONT)
      .fontSize(8)
      .fillColor(MUTED_COLOR)
      .text(`Snapshot được tạo lúc ${this.formatDateTime(new Date())}.`);
  }

  private drawTitle(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
  ) {
    document
      .roundedRect(48, 45, document.page.width - 96, 82, 8)
      .fill(PRIMARY_COLOR);
    document
      .fillColor('#FFFFFF')
      .font(BOLD_FONT)
      .fontSize(20)
      .text('HỒ SƠ NĂNG LỰC SỐ', 68, 65, {
        width: document.page.width - 136,
        align: 'center',
      })
      .font(REGULAR_FONT)
      .fontSize(11)
      .text(snapshot.user.fullName, 68, 98, {
        width: document.page.width - 136,
        align: 'center',
      });
    document.y = 145;
  }

  private drawStudentIdentity(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
    input: ExportPortfolioDto,
  ) {
    this.sectionHeading(document, 'Thông tin sinh viên');
    this.keyValue(document, 'Mã sinh viên', snapshot.studentCode);
    this.keyValue(document, 'Họ tên', snapshot.user.fullName);
    if (this.isVisible(input, 'email')) {
      this.keyValue(document, 'Email', snapshot.user.email);
    }
    this.keyValue(document, 'Lớp', snapshot.className);
    this.keyValue(document, 'Ngành', snapshot.major);
    this.keyValue(document, 'Niên khóa', snapshot.academicYear);
    if (this.isVisible(input, 'phone')) {
      this.keyValue(document, 'Điện thoại', snapshot.phone);
    }
    if (this.isVisible(input, 'dateOfBirth')) {
      this.keyValue(
        document,
        'Ngày sinh',
        snapshot.dateOfBirth ? this.formatDate(snapshot.dateOfBirth) : null,
      );
    }
  }

  private drawProfile(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
    input: ExportPortfolioDto,
  ) {
    this.sectionHeading(document, 'Hồ sơ và định hướng nghề nghiệp');
    if (!snapshot.profile) {
      this.emptyState(document);
      return;
    }

    this.keyValue(
      document,
      'Mục tiêu nghề nghiệp',
      snapshot.profile.careerGoal?.name,
    );
    this.keyValue(
      document,
      'Chuyên môn',
      snapshot.profile.specialization?.name,
    );
    if (snapshot.profile.summary) {
      this.paragraph(document, snapshot.profile.summary);
    }
    if (this.isVisible(input, 'externalLinks')) {
      this.keyValue(document, 'GitHub', snapshot.profile.githubUrl);
      this.keyValue(document, 'LinkedIn', snapshot.profile.linkedinUrl);
      this.keyValue(document, 'Portfolio', snapshot.profile.portfolioUrl);
    }
  }

  private drawSkills(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
  ) {
    this.sectionHeading(document, 'Kỹ năng');
    if (!snapshot.skills.length) {
      this.emptyState(document);
      return;
    }

    for (const item of snapshot.skills) {
      const category = item.skill.category?.name
        ? ` - ${item.skill.category.name}`
        : '';
      this.itemTitle(document, `${item.skill.name}${category}`);
      this.paragraph(
        document,
        `Mức hiện tại: ${item.currentLevel} | Minh chứng: ${this.formatEnum(item.evidenceStatus)}`,
        true,
      );
      if (item.description) {
        this.paragraph(document, item.description, true);
      }
    }
  }

  private drawEvidences(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
    input: ExportPortfolioDto,
  ) {
    this.sectionHeading(document, 'Minh chứng');
    if (!snapshot.evidences.length) {
      this.emptyState(document);
      return;
    }

    for (const evidence of snapshot.evidences) {
      this.itemTitle(
        document,
        `${this.formatEnum(evidence.relatedEntityType)} - ${this.formatEnum(evidence.status)}`,
      );
      this.paragraph(
        document,
        `Ngày tạo: ${this.formatDate(evidence.createdAt)}`,
        true,
      );
      if (evidence.note) {
        this.paragraph(document, evidence.note, true);
      }
      if (this.isVisible(input, 'evidenceLinks')) {
        if (evidence.evidenceUrl) {
          this.paragraph(document, `Liên kết: ${evidence.evidenceUrl}`, true);
        }
        if (evidence.fileUrl) {
          this.paragraph(document, `Tệp: ${evidence.fileUrl}`, true);
        }
      }
    }
  }

  private drawLatestAnalysis(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
  ) {
    const analysis = snapshot.analysisResults[0];
    if (analysis) {
      this.ensureSpace(document, 190);
    }
    this.sectionHeading(document, 'Kết quả phân tích năng lực mới nhất');
    if (!analysis) {
      this.emptyState(document);
      return;
    }

    this.keyValue(document, 'Mục tiêu nghề nghiệp', analysis.careerGoal.name);
    this.keyValue(document, 'Chuyên môn', analysis.specialization?.name);
    this.keyValue(
      document,
      'Hoàn thiện hồ sơ',
      `${Number(analysis.completionPercent).toFixed(2)}%`,
    );
    this.keyValue(
      document,
      'Mức độ phù hợp',
      `${Number(analysis.matchPercent).toFixed(2)}%`,
    );
    this.keyValue(document, 'Điểm rủi ro', String(analysis.riskScore));
    this.keyValue(document, 'Xếp loại', this.formatEnum(analysis.matchLevel));
    this.keyValue(document, 'Phân tích lúc', this.formatDateTime(analysis.analyzedAt));
  }

  private drawRecommendations(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
  ) {
    this.sectionHeading(document, 'Khuyến nghị');
    const recommendations = snapshot.analysisResults[0]?.recommendations ?? [];
    if (!recommendations.length) {
      this.emptyState(document);
      return;
    }

    for (const recommendation of recommendations) {
      this.itemTitle(document, recommendation.title);
      this.paragraph(
        document,
        `Kỹ năng: ${recommendation.skill.name} | Trạng thái: ${this.formatEnum(recommendation.status)} | Ưu tiên: ${Number(recommendation.priorityScore).toFixed(2)}`,
        true,
      );
      if (recommendation.description) {
        this.paragraph(document, recommendation.description, true);
      }
      if (recommendation.reason) {
        this.paragraph(document, `Lý do: ${recommendation.reason}`, true);
      }
    }
  }

  private drawRoadmap(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
  ) {
    this.sectionHeading(document, 'Lộ trình phát triển');
    const roadmap = snapshot.roadmaps[0];
    if (!roadmap) {
      this.emptyState(document);
      return;
    }

    this.itemTitle(document, roadmap.title);
    this.paragraph(
      document,
      `Phiên bản: ${roadmap.version} | Tiến độ: ${Number(roadmap.progressPercent).toFixed(2)}% | Trạng thái: ${this.formatEnum(roadmap.status)}`,
      true,
    );
    if (roadmap.description) {
      this.paragraph(document, roadmap.description, true);
    }
    for (const item of roadmap.items) {
      const skill = item.skill?.name ? ` | Kỹ năng: ${item.skill.name}` : '';
      this.itemTitle(document, item.title, 10);
      this.paragraph(
        document,
        `Loại: ${this.formatEnum(item.itemType)} | Trạng thái: ${this.formatEnum(item.status)}${skill}`,
        true,
      );
      if (item.deadline) {
        this.paragraph(
          document,
          `Hạn hoàn thành: ${this.formatDate(item.deadline)}`,
          true,
        );
      }
      if (item.description) {
        this.paragraph(document, item.description, true);
      }
    }
  }

  private sectionHeading(document: PDFKit.PDFDocument, title: string) {
    this.ensureSpace(document, 42);
    document.moveDown(0.9);
    const y = document.y;
    document.roundedRect(48, y, 5, 22, 2).fill(PRIMARY_COLOR);
    document
      .fillColor(PRIMARY_COLOR)
      .font(BOLD_FONT)
      .fontSize(13)
      .text(title, 62, y + 2, { width: document.page.width - 110 });
    document.y = y + 30;
  }

  private keyValue(
    document: PDFKit.PDFDocument,
    label: string,
    value?: string | null,
  ) {
    if (!value) {
      return;
    }
    this.ensureSpace(document, 22);
    const y = document.y;
    document
      .font(BOLD_FONT)
      .fontSize(9.5)
      .fillColor(MUTED_COLOR)
      .text(`${label}:`, 56, y, { width: 125, continued: false });
    document
      .font(REGULAR_FONT)
      .fillColor('#172B4D')
      .text(value, 181, y, { width: document.page.width - 229 });
    document.y = Math.max(document.y, y + 17);
  }

  private itemTitle(
    document: PDFKit.PDFDocument,
    title: string,
    fontSize = 10.5,
  ) {
    this.ensureSpace(document, 28);
    document
      .font(BOLD_FONT)
      .fontSize(fontSize)
      .fillColor('#172B4D')
      .text(`- ${title}`, 58, document.y, { width: document.page.width - 116 });
  }

  private paragraph(
    document: PDFKit.PDFDocument,
    text: string,
    compact = false,
  ) {
    document
      .font(REGULAR_FONT)
      .fontSize(compact ? 8.8 : 9.5)
      .fillColor(MUTED_COLOR)
      .text(text, compact ? 70 : 58, document.y + (compact ? 2 : 4), {
        width: document.page.width - (compact ? 128 : 116),
        lineGap: 2,
      });
  }

  private emptyState(document: PDFKit.PDFDocument) {
    this.ensureSpace(document, 24);
    document
      .font(REGULAR_FONT)
      .fontSize(9)
      .fillColor(MUTED_COLOR)
      .text('Chưa có dữ liệu cho phần này.', 58, document.y, {
        width: document.page.width - 116,
      });
  }

  private drawPageHeader(
    document: PDFKit.PDFDocument,
    snapshot: StudentPortfolioSnapshot,
  ) {
    document
      .font(BOLD_FONT)
      .fontSize(8)
      .fillColor(MUTED_COLOR)
      .text(
        `Hồ sơ năng lực số - ${snapshot.user.fullName}`,
        48,
        24,
        { width: document.page.width - 96, align: 'right', lineBreak: false },
      );
    document
      .moveTo(48, 39)
      .lineTo(document.page.width - 48, 39)
      .strokeColor(LIGHT_COLOR)
      .stroke();
    document.y = 56;
  }

  private drawPageNumbers(document: PDFKit.PDFDocument) {
    const range = document.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      document.switchToPage(range.start + index);
      const bottomMargin = document.page.margins.bottom;
      document.page.margins.bottom = 0;
      document
        .font(REGULAR_FONT)
        .fontSize(8)
        .fillColor(MUTED_COLOR)
        .text(
          `Trang ${index + 1}/${range.count}`,
          48,
          document.page.height - 34,
          {
            width: document.page.width - 96,
            align: 'center',
            lineBreak: false,
          },
        );
      document.page.margins.bottom = bottomMargin;
    }
  }

  private ensureSpace(document: PDFKit.PDFDocument, requiredHeight: number) {
    const bottom = document.page.height - document.page.margins.bottom;
    if (document.y + requiredHeight > bottom) {
      document.addPage();
    }
  }

  private isVisible(input: ExportPortfolioDto, key: string) {
    return input.privacy?.[key] !== false;
  }

  private formatEnum(value: string) {
    return value.replace(/_/g, ' ');
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(value);
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(value);
  }
}
