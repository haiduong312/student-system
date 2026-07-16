'use client';

import { Button, Space, Table, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordDetailLink } from '@/components/ui/RecordDetailLink';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Lecturer } from '@/types/management';

export function LecturerTable({
  lecturers,
  loading,
  page,
  pageSize,
  total,
  changingStatusId,
  onPaginationChange,
  onView,
  onEdit,
  onToggleStatus,
}: {
  lecturers: Lecturer[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  changingStatusId?: string;
  onPaginationChange: (pagination: TablePaginationConfig) => void;
  onView: (lecturer: Lecturer) => void;
  onEdit: (lecturer: Lecturer) => void;
  onToggleStatus: (lecturer: Lecturer) => void;
}) {
  const columns: TableColumnsType<Lecturer> = [
    {
      title: 'Lecturer',
      key: 'lecturer',
      fixed: 'left',
      width: 250,
      render: (_value, lecturer) => (
        <Space direction="vertical" size={0}>
          <RecordDetailLink
            ariaLabel={`View details for lecturer ${lecturer.user.fullName}`}
            onClick={() => onView(lecturer)}
          >
            {lecturer.user.fullName}
          </RecordDetailLink>
          <Typography.Text type="secondary">{lecturer.user.email}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Lecturer code', dataIndex: 'lecturerCode', width: 150 },
    { title: 'Academic title', dataIndex: 'academicTitle', width: 160, render: valueOrDash },
    { title: 'Department', dataIndex: 'department', width: 200, render: valueOrDash },
    { title: 'Phone', dataIndex: 'phone', width: 150, render: valueOrDash },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_value, lecturer) => <StatusBadge status={lecturer.user.status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_value, lecturer) => {
        const isActive = lecturer.user.status === 'ACTIVE';
        const isChangingStatus = changingStatusId === lecturer.id;

        return (
          <Space size="small">
            <Button size="small" onClick={() => onEdit(lecturer)}>
              Edit
            </Button>
            <Button
              danger={isActive}
              size="small"
              loading={isChangingStatus}
              disabled={Boolean(changingStatusId) && !isChangingStatus}
              onClick={() => onToggleStatus(lecturer)}
            >
              {isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table<Lecturer>
      rowKey="id"
      columns={columns}
      dataSource={lecturers}
      loading={loading}
      scroll={{ x: 1300 }}
      locale={{ emptyText: <EmptyState description="No lecturers found." /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} lecturers`,
      }}
      onChange={onPaginationChange}
    />
  );
}

function valueOrDash(value?: string | null) {
  return value || '-';
}
