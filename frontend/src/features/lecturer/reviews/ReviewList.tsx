'use client';

import { Rate, Space, Table, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import dayjs from 'dayjs';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordDetailLink } from '@/components/ui/RecordDetailLink';
import type { AdvisorReview } from '@/types/management';

export function ReviewList({
  reviews,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}: {
  reviews: AdvisorReview[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (pagination: TablePaginationConfig) => void;
  onView: (review: AdvisorReview) => void;
}) {
  const columns: TableColumnsType<AdvisorReview> = [
    {
      title: 'Reviewer',
      key: 'lecturer',
      width: 220,
      render: (_value, review) => (
        <Space direction="vertical" size={0}>
          <RecordDetailLink
            ariaLabel={`View review details from ${review.lecturer.user.fullName}`}
            onClick={() => onView(review)}
          >
            {review.lecturer.user.fullName}
          </RecordDetailLink>
          <Typography.Text type="secondary">{review.lecturer.lecturerCode}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Review',
      dataIndex: 'reviewContent',
      ellipsis: true,
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      width: 150,
      render: (rating?: number | null) =>
        rating ? <Rate disabled value={rating} style={{ fontSize: 14 }} /> : '-',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 170,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
  ];

  return (
    <Table<AdvisorReview>
      rowKey="id"
      columns={columns}
      dataSource={reviews}
      loading={loading}
      scroll={{ x: 950 }}
      locale={{ emptyText: <EmptyState description="This student has no advisor reviews yet." /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} reviews`,
      }}
      onChange={onPaginationChange}
    />
  );
}
