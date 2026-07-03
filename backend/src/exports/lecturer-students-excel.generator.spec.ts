import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ExcelJS = require('exceljs');
import { LecturerStudentsExcelGenerator } from './lecturer-students-excel.generator';

describe('LecturerStudentsExcelGenerator', () => {
  it('creates an XLSX workbook from active assignment fields', async () => {
    const assignedAt = new Date('2026-06-15T02:30:00.000Z');
    const generator = new LecturerStudentsExcelGenerator();
    const buffer = await generator.generate([
      {
        assignedAt,
        lecturer: {
          lecturerCode: 'GV001',
          user: { fullName: 'Lecturer One' },
        },
        student: {
          studentCode: 'SV001',
          className: 'SE01',
          major: 'Software Engineering',
          user: {
            fullName: 'Student One',
            email: 'student.one@example.com',
          },
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('Assigned students');

    assert.ok(worksheet);
    assert.equal(worksheet.getCell('A1').value, 'Mã sinh viên');
    assert.equal(worksheet.getCell('A2').value, 'SV001');
    assert.equal(worksheet.getCell('B2').value, 'Student One');
    assert.equal(worksheet.getCell('C2').value, 'student.one@example.com');
    assert.equal(worksheet.getCell('D2').value, 'SE01');
    assert.equal(worksheet.getCell('E2').value, 'Software Engineering');
    assert.equal(worksheet.getCell('F2').value, 'Lecturer One');
    assert.equal(worksheet.getCell('G2').value, 'GV001');
    assert.deepEqual(worksheet.getCell('H2').value, assignedAt);
  });
});
