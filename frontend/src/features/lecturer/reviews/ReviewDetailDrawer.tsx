'use client';

import { Descriptions, Drawer, Rate, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { QueryState } from '@/components/ui/QueryState';
import { advisorReviewsService } from '@/features/management/advisor-reviews.service';

export function ReviewDetailDrawer({
  reviewId,
  open,
  onClose,
}: {
  reviewId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['lecturer', 'reviews', 'detail', reviewId],
    queryFn: () => advisorReviewsService.getAdvisorReviewDetail(reviewId!),
    enabled: open && Boolean(reviewId),
  });
  const review = query.data;

  return (
    <Drawer title="Advisor review details" width={720} open={open} onClose={onClose}>
      <QueryState loading={query.isLoading} error={query.error}>
        {review ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 4 }}>
                {review.student.user.fullName}
              </Typography.Title>
              <Typography.Text type="secondary">
                {review.student.studentCode} · Reviewed by {review.lecturer.user.fullName}
              </Typography.Text>
            </div>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Rating">
                {review.rating ? (
                  <Rate disabled value={review.rating} style={{ fontSize: 16 }} />
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Review">
                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {review.reviewContent}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Suggestion">
                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {review.suggestion || '-'}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(review.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Last updated">
                {dayjs(review.updatedAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </QueryState>
    </Drawer>
  );
}
