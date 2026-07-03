import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import type { LecturerStudentExportRecord } from '../advisor-assignments/advisor-assignments.service';

@Injectable()
export class LecturerStudentsExcelGenerator {
  async generate(assignments: LecturerStudentExportRecord[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Digital Competency Profile';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Assigned students', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = [
      { header: 'Mã sinh viên', key: 'studentCode', width: 18 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Lớp', key: 'className', width: 18 },
      { header: 'Ngành', key: 'major', width: 26 },
      { header: 'Cố vấn/Giảng viên', key: 'lecturerName', width: 28 },
      { header: 'Mã giảng viên', key: 'lecturerCode', width: 18 },
      { header: 'Ngày phân công', key: 'assignedAt', width: 20 },
    ];

    for (const assignment of assignments) {
      worksheet.addRow({
        studentCode: assignment.student.studentCode,
        fullName: assignment.student.user.fullName,
        email: assignment.student.user.email,
        className: assignment.student.className ?? '',
        major: assignment.student.major ?? '',
        lecturerName: assignment.lecturer.user.fullName,
        lecturerCode: assignment.lecturer.lecturerCode,
        assignedAt: assignment.assignedAt,
      });
    }

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getColumn('assignedAt').numFmt = 'dd/mm/yyyy hh:mm';
    worksheet.autoFilter = { from: 'A1', to: 'H1' };

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(workbookBuffer);
  }
}
