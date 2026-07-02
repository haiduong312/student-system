'use client';

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Empty, Space, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { advisorReviewsService } from '@/features/management/advisor-reviews.service';
import { getApiErrorMessage } from '@/lib/errors';
import type { CreateAdvisorReviewRequest, Student } from '@/types/management';
import { AssignedStudentSelect } from './AssignedStudentSelect';
import { ReviewDetailDrawer } from './ReviewDetailDrawer';
import { ReviewFormModal } from './ReviewFormModal';
import { ReviewList } from './ReviewList';

const DEFAULT_PAGE_SIZE = 10;

export function LecturerReviewsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [detailReviewId, setDetailReviewId] = useState<string | null>(null);

  const reviews = useQuery({
    queryKey: ['lecturer', 'reviews', student?.id, page, pageSize],
    queryFn: () =>
      advisorReviewsService.getReviewsByStudent(student!.id, {
        page,
        limit: pageSize,
      }),
    enabled: Boolean(student),
  });

  const createReview = useMutation({
    mutationFn: ({
      studentId,
      payload,
    }: {
      studentId: string;
      payload: CreateAdvisorReviewRequest;
    }) => advisorReviewsService.createAdvisorReview(studentId, payload),
    onSuccess: (_review, { studentId }) => {
      message.success('Advisor review created.');
      setFormOpen(false);
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ['lecturer', 'reviews', studentId] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const selectStudent = (nextStudent: Student | null) => {
    setStudent(nextStudent);
    setPage(1);
    setDetailReviewId(null);
    setFormOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Advisor Reviews"
        description="Select an assigned student to view or create advisor reviews."
      />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text strong>Assigned student</Typography.Text>
          <AssignedStudentSelect student={student} onChange={selectStudent} />
        </Space>
      </Card>

      {!student ? (
        <Card>
          <Empty description="Select an assigned student to load advisor reviews." />
        </Card>
      ) : (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space wrap style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Typography.Text strong>{student.user.fullName}</Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  {student.studentCode} · {student.className || 'No class'}
                </Typography.Text>
              </div>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  loading={reviews.isFetching}
                  onClick={() => reviews.refetch()}
                >
                  Refresh
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
                  Add review
                </Button>
              </Space>
            </Space>
          </Card>
          <QueryState loading={reviews.isLoading && !reviews.data} error={reviews.error}>
            <ReviewList
              reviews={reviews.data?.data ?? []}
              loading={reviews.isFetching}
              page={page}
              pageSize={pageSize}
              total={reviews.data?.meta.total ?? 0}
              onPaginationChange={(pagination) => {
                setPage(pagination.current ?? 1);
                setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
              }}
              onView={(review) => setDetailReviewId(review.id)}
            />
          </QueryState>
        </>
      )}

      <ReviewFormModal
        open={formOpen}
        student={student}
        submitting={createReview.isPending}
        onCancel={() => {
          if (!createReview.isPending) setFormOpen(false);
        }}
        onSubmit={(payload) => {
          if (student && !createReview.isPending) {
            createReview.mutate({ studentId: student.id, payload });
          }
        }}
      />

      <ReviewDetailDrawer
        reviewId={detailReviewId}
        open={Boolean(detailReviewId)}
        onClose={() => setDetailReviewId(null)}
      />
    </>
  );
}
