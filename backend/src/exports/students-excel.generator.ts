import { Injectable } from '@nestjs/common';
import ExcelJS = require('exceljs');
import type { StudentExportRecord } from '../students/students.service';

@Injectable()
export class StudentsExcelGenerator {
  async generate(students: StudentExportRecord[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Digital Competency Profile';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Students', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = [
      { header: 'Mã sinh viên', key: 'studentCode', width: 18 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Lớp', key: 'className', width: 18 },
      { header: 'Ngành', key: 'major', width: 26 },
      { header: 'Niên khóa', key: 'academicYear', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 16 },
    ];

    for (const student of students) {
      worksheet.addRow({
        studentCode: student.studentCode,
        fullName: student.user.fullName,
        email: student.user.email,
        className: student.className ?? '',
        major: student.major ?? '',
        academicYear: student.academicYear ?? '',
        status: student.user.status,
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
    worksheet.autoFilter = { from: 'A1', to: 'G1' };

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(workbookBuffer);
  }
}
