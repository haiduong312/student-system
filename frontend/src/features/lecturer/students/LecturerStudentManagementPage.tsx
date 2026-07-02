'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { studentsService } from '@/features/management/students.service';
import { LecturerStudentDetailDrawer } from './LecturerStudentDetailDrawer';
import {
  LecturerStudentFilterBar,
  type LecturerStudentFilters,
} from './LecturerStudentFilterBar';
import { LecturerStudentTable } from './LecturerStudentTable';

const DEFAULT_PAGE_SIZE = 10;

export function LecturerStudentManagementPage() {
  const [filters, setFilters] = useState<LecturerStudentFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);

  const students = useQuery({
    queryKey: ['lecturer', 'students', 'list', filters, page, pageSize],
    queryFn: () =>
      studentsService.getStudents({
        ...filters,
        page,
        limit: pageSize,
      }),
  });

  return (
    <>
      <PageHeader
        title="Assigned Students"
        description="Students with an active advisor assignment to your account."
      />
      <LecturerStudentFilterBar
        filters={filters}
        refreshing={students.isFetching}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onRefresh={() => students.refetch()}
      />
      <QueryState loading={students.isLoading && !students.data} error={students.error}>
        <LecturerStudentTable
          students={students.data?.data ?? []}
          loading={students.isFetching}
          page={page}
          pageSize={pageSize}
          total={students.data?.meta.total ?? 0}
          onPaginationChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
          onView={(student) => setDetailStudentId(student.id)}
        />
      </QueryState>
      <LecturerStudentDetailDrawer
        studentId={detailStudentId}
        open={Boolean(detailStudentId)}
        onClose={() => setDetailStudentId(null)}
      />
    </>
  );
}
