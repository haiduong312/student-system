'use client';

import { PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { advisorAssignmentsService } from '@/features/management/advisor-assignments.service';
import { getApiErrorMessage } from '@/lib/errors';
import type { AdvisorAssignment } from '@/types/management';
import { AdvisorAssignmentDetailDrawer } from './AdvisorAssignmentDetailDrawer';
import {
  AdvisorAssignmentFilterBar,
  type AdvisorAssignmentFilters,
} from './AdvisorAssignmentFilterBar';
import {
  AdvisorAssignmentFormModal,
  type AdvisorAssignmentFormSubmission,
} from './AdvisorAssignmentFormModal';
import { AdvisorAssignmentTable } from './AdvisorAssignmentTable';

const DEFAULT_PAGE_SIZE = 10;

export function AdvisorAssignmentManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdvisorAssignmentFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editingAssignment, setEditingAssignment] = useState<AdvisorAssignment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailAssignmentId, setDetailAssignmentId] = useState<string | null>(null);

  const assignments = useQuery({
    queryKey: ['admin', 'advisor-assignments', 'list', filters, page, pageSize],
    queryFn: () =>
      advisorAssignmentsService.getAdvisorAssignments({
        ...filters,
        page,
        limit: pageSize,
      }),
  });

  const saveAssignment = useMutation({
    mutationFn: (submission: AdvisorAssignmentFormSubmission) =>
      submission.mode === 'update'
        ? advisorAssignmentsService.updateAdvisorAssignment(
            submission.assignmentId,
            submission.payload,
          )
        : advisorAssignmentsService.createAdvisorAssignment(submission.payload),
    onSuccess: (_assignment, submission) => {
      message.success(
        submission.mode === 'update' ? 'Assignment updated.' : 'Assignment created.',
      );
      if (submission.mode === 'create') setPage(1);
      setFormOpen(false);
      setEditingAssignment(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'advisor-assignments'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const deleteAssignment = useMutation({
    mutationFn: (assignment: AdvisorAssignment) =>
      advisorAssignmentsService.deleteAdvisorAssignment(assignment.id),
    onSuccess: (_result, assignment) => {
      message.success('Assignment deleted.');
      if (assignments.data?.data.length === 1 && page > 1) setPage((current) => current - 1);
      if (detailAssignmentId === assignment.id) setDetailAssignmentId(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'advisor-assignments'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const confirmDelete = (assignment: AdvisorAssignment) => {
    modal.confirm({
      title: 'Delete advisor assignment?',
      content: `Remove ${assignment.lecturer.user.fullName} as advisor for ${assignment.student.user.fullName} (${assignment.student.studentCode})?`,
      okText: 'Delete assignment',
      okButtonProps: { danger: true },
      onOk: () => deleteAssignment.mutateAsync(assignment).then(() => undefined),
    });
  };

  return (
    <>
      <PageHeader
        title="Advisor Assignments"
        description="Assign lecturers and academic advisors to students."
      />
      <AdvisorAssignmentFilterBar
        filters={filters}
        refreshing={assignments.isFetching}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onRefresh={() => assignments.refetch()}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAssignment(null);
              setFormOpen(true);
            }}
          >
            Add assignment
          </Button>
        }
      />

      <QueryState loading={assignments.isLoading && !assignments.data} error={assignments.error}>
        <AdvisorAssignmentTable
          assignments={assignments.data?.data ?? []}
          loading={assignments.isFetching}
          page={page}
          pageSize={pageSize}
          total={assignments.data?.meta.total ?? 0}
          deletingId={deleteAssignment.isPending ? deleteAssignment.variables?.id : undefined}
          onPaginationChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
          onView={(assignment) => setDetailAssignmentId(assignment.id)}
          onEdit={(assignment) => {
            setEditingAssignment(assignment);
            setFormOpen(true);
          }}
          onDelete={confirmDelete}
        />
      </QueryState>

      <AdvisorAssignmentFormModal
        open={formOpen}
        assignment={editingAssignment}
        submitting={saveAssignment.isPending}
        onCancel={() => {
          if (saveAssignment.isPending) return;
          setFormOpen(false);
          setEditingAssignment(null);
        }}
        onSubmit={(submission) => {
          if (!saveAssignment.isPending) saveAssignment.mutate(submission);
        }}
      />

      <AdvisorAssignmentDetailDrawer
        assignmentId={detailAssignmentId}
        open={Boolean(detailAssignmentId)}
        onClose={() => setDetailAssignmentId(null)}
      />
    </>
  );
}
