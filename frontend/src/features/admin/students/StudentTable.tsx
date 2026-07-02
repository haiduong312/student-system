'use client';

import { Button, Space, Table, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Student } from '@/types/management';

export function StudentTable({
  students,
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
  students: Student[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  changingStatusId?: string;
  onPaginationChange: (pagination: TablePaginationConfig) => void;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onToggleStatus: (student: Student) => void;
}) {
  const columns: TableColumnsType<Student> = [
    {
      title: 'Student',
      key: 'student',
      fixed: 'left',
      width: 240,
      render: (_value, student) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{student.user.fullName}</Typography.Text>
          <Typography.Text type="secondary">{student.user.email}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Student code', dataIndex: 'studentCode', width: 140 },
    { title: 'Class', dataIndex: 'className', width: 130, render: valueOrDash },
    { title: 'Major', dataIndex: 'major', width: 180, render: valueOrDash },
    { title: 'Academic year', dataIndex: 'academicYear', width: 140, render: valueOrDash },
    { title: 'Phone', dataIndex: 'phone', width: 140, render: valueOrDash },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_value, student) => <StatusBadge status={student.user.status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 250,
      render: (_value, student) => {
        const isActive = student.user.status === 'ACTIVE';
        const isChangingStatus = changingStatusId === student.id;

        return (
          <Space size="small">
            <Button size="small" onClick={() => onView(student)}>
              View
            </Button>
            <Button size="small" onClick={() => onEdit(student)}>
              Edit
            </Button>
            <Button
              danger={isActive}
              size="small"
              loading={isChangingStatus}
              disabled={Boolean(changingStatusId) && !isChangingStatus}
              onClick={() => onToggleStatus(student)}
            >
              {isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table<Student>
      rowKey="id"
      columns={columns}
      dataSource={students}
      loading={loading}
      scroll={{ x: 1450 }}
      locale={{ emptyText: <EmptyState description="No students found." /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} students`,
      }}
      onChange={onPaginationChange}
    />
  );
}

function valueOrDash(value?: string | null) {
  return value || '-';
}
