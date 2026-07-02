'use client';

import { App, Button } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { studentsService } from '@/features/management/students.service';
import { getApiErrorMessage } from '@/lib/errors';
import type {
  DeactivateUserResult,
  ImportStudentsRequest,
  ImportStudentsResult,
  ReactivateUserResult,
  Student,
} from '@/types/management';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import { StudentFilterBar, type StudentFilters } from './StudentFilterBar';
import { StudentFormModal, type StudentFormSubmission } from './StudentFormModal';
import { StudentImportModal } from './StudentImportModal';
import { StudentTable } from './StudentTable';

const DEFAULT_PAGE_SIZE = 10;

export function StudentManagementPage() {
  const { message, modal, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<StudentFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportStudentsResult | null>(null);

  const students = useQuery({
    queryKey: ['admin', 'students', 'list', filters, page, pageSize],
    queryFn: () =>
      studentsService.getStudents({
        ...filters,
        page,
        limit: pageSize,
      }),
  });

  const saveStudent = useMutation({
    mutationFn: (submission: StudentFormSubmission) =>
      submission.mode === 'update'
        ? studentsService.updateStudent(submission.studentId, submission.payload)
        : studentsService.createStudent(submission.payload),
    onSuccess: (_student, submission) => {
      message.success(submission.mode === 'update' ? 'Student updated.' : 'Student created.');
      setFormOpen(false);
      setEditingStudent(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({
      student,
    }: {
      student: Student;
    }): Promise<DeactivateUserResult | ReactivateUserResult> =>
      student.user.status === 'ACTIVE'
        ? studentsService.deactivateStudent(student.id)
        : studentsService.reactivateStudent(student.id),
    onSuccess: (_result, { student }) => {
      message.success(
        student.user.status === 'ACTIVE' ? 'Student deactivated.' : 'Student reactivated.',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const importStudents = useMutation({
    mutationFn: (payload: ImportStudentsRequest) => studentsService.importStudents(payload),
    onSuccess: (result) => {
      setImportResult(result);
      message.success(`Import complete: ${result.created} student(s) created.`);
      if (result.errors.length) {
        notification.warning({
          message: 'Some rows were not imported',
          description: `${result.skipped} skipped and ${result.failed} failed. Review the import result for details.`,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingStudent(null);
    setFormOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  const confirmStatusChange = (student: Student) => {
    const deactivating = student.user.status === 'ACTIVE';
    modal.confirm({
      title: `${deactivating ? 'Deactivate' : 'Reactivate'} student?`,
      content: `${student.user.fullName} (${student.studentCode}) will be ${
        deactivating ? 'unable to sign in' : 'allowed to sign in again'
      }.`,
      okText: deactivating ? 'Deactivate' : 'Reactivate',
      okButtonProps: { danger: deactivating },
      onOk: () => changeStatus.mutateAsync({ student }).then(() => undefined),
    });
  };

  const closeImport = () => {
    if (importStudents.isPending) return;
    setImportOpen(false);
    setImportResult(null);
  };

  return (
    <>
      <PageHeader title="Students" description="Manage student accounts and academic profiles." />
      <StudentFilterBar
        filters={filters}
        refreshing={students.isFetching}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onRefresh={() => students.refetch()}
        actions={
          <>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                setImportResult(null);
                setImportOpen(true);
              }}
            >
              Import
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add student
            </Button>
          </>
        }
      />

      <QueryState loading={students.isLoading && !students.data} error={students.error}>
        <StudentTable
          students={students.data?.data ?? []}
          loading={students.isFetching}
          page={page}
          pageSize={pageSize}
          total={students.data?.meta.total ?? 0}
          changingStatusId={changeStatus.isPending ? changeStatus.variables?.student.id : undefined}
          onPaginationChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
          onView={(student) => setDetailStudentId(student.id)}
          onEdit={openEdit}
          onToggleStatus={confirmStatusChange}
        />
      </QueryState>

      <StudentFormModal
        open={formOpen}
        student={editingStudent}
        submitting={saveStudent.isPending}
        onCancel={() => {
          if (saveStudent.isPending) return;
          setFormOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={(submission) => {
          if (!saveStudent.isPending) saveStudent.mutate(submission);
        }}
      />

      <StudentDetailDrawer
        studentId={detailStudentId}
        open={Boolean(detailStudentId)}
        onClose={() => setDetailStudentId(null)}
      />

      <StudentImportModal
        open={importOpen}
        submitting={importStudents.isPending}
        result={importResult}
        onCancel={closeImport}
        onSubmit={(payload) => {
          if (!importStudents.isPending) importStudents.mutate(payload);
        }}
      />
    </>
  );
}
