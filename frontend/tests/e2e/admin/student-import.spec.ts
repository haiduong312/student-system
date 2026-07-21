import { expect, test } from '../fixtures';
import { AdminStudentsPage } from '../pages';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Admin student import', () => {
  test('previews CSV data and reports created and duplicate rows', async ({ adminPage }) => {
    test.slow();
    const token = uniqueE2EName('StudentImport').toLowerCase();
    const email = `${token}@example.test`;
    const studentCode = token.slice(0, 48);
    const duplicateCode = `${studentCode.slice(0, 44)}-dup`;
    const students = new AdminStudentsPage(adminPage);

    await students.goto();
    await students.expectLoaded();

    const modal = await students.openImport();
    await students.uploadCsv(
      modal,
      [
        'email,fullName,studentCode,className,major,academicYear',
        `${email},E2E Imported Student,${studentCode},SE-E2E,Software Engineering,2024-2028`,
        `${email},E2E Duplicate Student,${duplicateCode},SE-E2E,Software Engineering,2024-2028`,
      ].join('\n'),
    );
    await students.expectPreview(modal, 2);

    const result = await students.submitImport(modal, 2);
    await students.expectResult(result, { created: 1, skipped: 1, failed: 0 });
    await expect(result.getByText('Email already exists', { exact: true })).toBeVisible();
    await expect(result.getByRole('button', { name: 'Download credentials' })).toBeVisible();

    await students.closeResult(result);
    await students.search(email);
    await students.expectStudent(email);
    await students.deactivateStudent(email);
  });
});
