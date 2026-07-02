'use client';

import { Button, Space, Table, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Student } from '@/types/management';

export function LecturerStudentTable({
  students,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}: {
  students: Student[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (pagination: TablePaginationConfig) => void;
  onView: (student: Student) => void;
}) {
  const columns: TableColumnsType<Student> = [
    {
      title: 'Student',
      key: 'student',
      width: 260,
      render: (_value, student) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{student.user.fullName}</Typography.Text>
          <Typography.Text type="secondary">{student.user.email}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Student code', dataIndex: 'studentCode', width: 150 },
    { title: 'Class', dataIndex: 'className', width: 140, render: valueOrDash },
    { title: 'Major', dataIndex: 'major', width: 210, render: valueOrDash },
    { title: 'Academic year', dataIndex: 'academicYear', width: 150, render: valueOrDash },
    {
      title: 'Career goal',
      key: 'careerGoal',
      width: 200,
      render: (_value, student) => student.profile?.careerGoal?.name || '-',
    },
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
      width: 100,
      render: (_value, student) => (
        <Button size="small" onClick={() => onView(student)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <Table<Student>
      rowKey="id"
      columns={columns}
      dataSource={students}
      loading={loading}
      scroll={{ x: 1350 }}
      locale={{ emptyText: <EmptyState description="No assigned students found." /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} assigned students`,
      }}
      onChange={onPaginationChange}
    />
  );
}

function valueOrDash(value?: string | null) {
  return value || '-';
}
