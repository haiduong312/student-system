import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UserStatus } from '@prisma/client';
import ExcelJS = require('exceljs');
import { StudentsExcelGenerator } from './students-excel.generator';

describe('StudentsExcelGenerator', () => {
  it('creates an XLSX workbook from student entity fields', async () => {
    const generator = new StudentsExcelGenerator();
    const buffer = await generator.generate([
      {
        studentCode: 'SV001',
        className: 'SE01',
        major: 'Software Engineering',
        academicYear: '2024',
        user: {
          fullName: 'Student One',
          email: 'student.one@example.com',
          status: UserStatus.ACTIVE,
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('Students');

    assert.ok(worksheet);
    assert.equal(worksheet.getCell('A1').value, 'Mã sinh viên');
    assert.equal(worksheet.getCell('A2').value, 'SV001');
    assert.equal(worksheet.getCell('B2').value, 'Student One');
    assert.equal(worksheet.getCell('C2').value, 'student.one@example.com');
    assert.equal(worksheet.getCell('D2').value, 'SE01');
    assert.equal(worksheet.getCell('E2').value, 'Software Engineering');
    assert.equal(worksheet.getCell('F2').value, '2024');
    assert.equal(worksheet.getCell('G2').value, UserStatus.ACTIVE);
  });
});
