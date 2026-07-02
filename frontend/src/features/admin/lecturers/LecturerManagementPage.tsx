'use client';

import { PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { lecturersService } from '@/features/management/lecturers.service';
import { getApiErrorMessage } from '@/lib/errors';
import type {
  DeactivateUserResult,
  Lecturer,
  ReactivateUserResult,
} from '@/types/management';
import { LecturerDetailDrawer } from './LecturerDetailDrawer';
import { LecturerFilterBar, type LecturerFilters } from './LecturerFilterBar';
import { LecturerFormModal, type LecturerFormSubmission } from './LecturerFormModal';
import { LecturerTable } from './LecturerTable';

const DEFAULT_PAGE_SIZE = 10;

export function LecturerManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LecturerFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailLecturerId, setDetailLecturerId] = useState<string | null>(null);

  const lecturers = useQuery({
    queryKey: ['admin', 'lecturers', 'list', filters, page, pageSize],
    queryFn: () =>
      lecturersService.getLecturers({
        ...filters,
        page,
        limit: pageSize,
      }),
  });

  const saveLecturer = useMutation({
    mutationFn: (submission: LecturerFormSubmission) =>
      submission.mode === 'update'
        ? lecturersService.updateLecturer(submission.lecturerId, submission.payload)
        : lecturersService.createLecturer(submission.payload),
    onSuccess: (_lecturer, submission) => {
      message.success(submission.mode === 'update' ? 'Lecturer updated.' : 'Lecturer created.');
      setFormOpen(false);
      setEditingLecturer(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lecturers'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({
      lecturer,
    }: {
      lecturer: Lecturer;
    }): Promise<DeactivateUserResult | ReactivateUserResult> =>
      lecturer.user.status === 'ACTIVE'
        ? lecturersService.deactivateLecturer(lecturer.id)
        : lecturersService.reactivateLecturer(lecturer.id),
    onSuccess: (_result, { lecturer }) => {
      message.success(
        lecturer.user.status === 'ACTIVE' ? 'Lecturer deactivated.' : 'Lecturer reactivated.',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lecturers'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const confirmStatusChange = (lecturer: Lecturer) => {
    const deactivating = lecturer.user.status === 'ACTIVE';
    modal.confirm({
      title: `${deactivating ? 'Deactivate' : 'Reactivate'} lecturer?`,
      content: `${lecturer.user.fullName} (${lecturer.lecturerCode}) will be ${
        deactivating ? 'unable to sign in' : 'allowed to sign in again'
      }.`,
      okText: deactivating ? 'Deactivate' : 'Reactivate',
      okButtonProps: { danger: deactivating },
      onOk: () => changeStatus.mutateAsync({ lecturer }).then(() => undefined),
    });
  };

  return (
    <>
      <PageHeader
        title="Lecturers"
        description="Manage lecturer accounts and academic advisor information."
      />
      <LecturerFilterBar
        filters={filters}
        refreshing={lecturers.isFetching}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onRefresh={() => lecturers.refetch()}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingLecturer(null);
              setFormOpen(true);
            }}
          >
            Add lecturer
          </Button>
        }
      />

      <QueryState loading={lecturers.isLoading && !lecturers.data} error={lecturers.error}>
        <LecturerTable
          lecturers={lecturers.data?.data ?? []}
          loading={lecturers.isFetching}
          page={page}
          pageSize={pageSize}
          total={lecturers.data?.meta.total ?? 0}
          changingStatusId={
            changeStatus.isPending ? changeStatus.variables?.lecturer.id : undefined
          }
          onPaginationChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
          onView={(lecturer) => setDetailLecturerId(lecturer.id)}
          onEdit={(lecturer) => {
            setEditingLecturer(lecturer);
            setFormOpen(true);
          }}
          onToggleStatus={confirmStatusChange}
        />
      </QueryState>

      <LecturerFormModal
        open={formOpen}
        lecturer={editingLecturer}
        submitting={saveLecturer.isPending}
        onCancel={() => {
          if (saveLecturer.isPending) return;
          setFormOpen(false);
          setEditingLecturer(null);
        }}
        onSubmit={(submission) => {
          if (!saveLecturer.isPending) saveLecturer.mutate(submission);
        }}
      />

      <LecturerDetailDrawer
        lecturerId={detailLecturerId}
        open={Boolean(detailLecturerId)}
        onClose={() => setDetailLecturerId(null)}
      />
    </>
  );
}
