'use client';

import { Button, Space, Table, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import dayjs from 'dayjs';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordDetailLink } from '@/components/ui/RecordDetailLink';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AdvisorAssignment } from '@/types/management';

export function AdvisorAssignmentTable({
  assignments,
  loading,
  page,
  pageSize,
  total,
  deletingId,
  onPaginationChange,
  onView,
  onEdit,
  onDelete,
}: {
  assignments: AdvisorAssignment[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  deletingId?: string;
  onPaginationChange: (pagination: TablePaginationConfig) => void;
  onView: (assignment: AdvisorAssignment) => void;
  onEdit: (assignment: AdvisorAssignment) => void;
  onDelete: (assignment: AdvisorAssignment) => void;
}) {
  const columns: TableColumnsType<AdvisorAssignment> = [
    {
      title: 'Lecturer / Advisor',
      key: 'lecturer',
      width: 260,
      render: (_value, assignment) => (
        <Space direction="vertical" size={0}>
          <RecordDetailLink
            ariaLabel={`View details for advisor assignment ${assignment.lecturer.user.fullName}`}
            onClick={() => onView(assignment)}
          >
            {assignment.lecturer.user.fullName}
          </RecordDetailLink>
          <Typography.Text type="secondary">
            {assignment.lecturer.lecturerCode} · {assignment.lecturer.department || 'No department'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Student',
      key: 'student',
      width: 260,
      render: (_value, assignment) => (
        <Space direction="vertical" size={0}>
          <RecordDetailLink
            ariaLabel={`View advisor assignment for student ${assignment.student.user.fullName}`}
            onClick={() => onView(assignment)}
          >
            {assignment.student.user.fullName}
          </RecordDetailLink>
          <Typography.Text type="secondary">
            {assignment.student.studentCode} · {assignment.student.className || 'No class'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Assigned by',
      key: 'assignedBy',
      width: 200,
      render: (_value, assignment) => assignment.assignedBy?.fullName || '-',
    },
    {
      title: 'Assigned at',
      dataIndex: 'assignedAt',
      width: 170,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_value, assignment) => {
        const isDeleting = deletingId === assignment.id;
        return (
          <Space size="small">
            <Button size="small" onClick={() => onEdit(assignment)}>Edit</Button>
            <Button
              danger
              size="small"
              loading={isDeleting}
              disabled={Boolean(deletingId) && !isDeleting}
              onClick={() => onDelete(assignment)}
            >
              Delete
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table<AdvisorAssignment>
      rowKey="id"
      columns={columns}
      dataSource={assignments}
      loading={loading}
      scroll={{ x: 1250 }}
      locale={{ emptyText: <EmptyState description="No advisor assignments found." /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} assignments`,
      }}
      onChange={onPaginationChange}
    />
  );
}
