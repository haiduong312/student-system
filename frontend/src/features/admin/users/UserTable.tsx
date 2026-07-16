'use client';

import { Button, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import dayjs from 'dayjs';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordDetailLink } from '@/components/ui/RecordDetailLink';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { User } from '@/types/management';

export function UserTable({
  users,
  loading,
  page,
  pageSize,
  total,
  changingStatusId,
  resettingId,
  onPaginationChange,
  onView,
  onEdit,
  onToggleStatus,
  onResetPassword,
}: {
  users: User[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  changingStatusId?: string;
  resettingId?: string;
  onPaginationChange: (pagination: TablePaginationConfig) => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onResetPassword: (user: User) => void;
}) {
  const columns: TableColumnsType<User> = [
    {
      title: 'User',
      key: 'user',
      fixed: 'left',
      width: 250,
      render: (_value, user) => (
        <Space direction="vertical" size={0}>
          <RecordDetailLink
            ariaLabel={`View details for user ${user.fullName}`}
            onClick={() => onView(user)}
          >
            {user.fullName}
          </RecordDetailLink>
          <Typography.Text type="secondary">{user.email}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 120,
      render: (role) => <Tag color={roleColor(role)}>{role}</Tag>,
    },
    { title: 'Profile code', key: 'profileCode', width: 150, render: (_value, user) => profileCode(user) },
    { title: 'Phone', key: 'phone', width: 140, render: (_value, user) => user.student?.phone || user.lecturer?.phone || '-' },
    {
      title: 'Last login',
      dataIndex: 'lastLoginAt',
      width: 170,
      render: (value?: string | null) => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
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
      width: 330,
      render: (_value, user) => {
        const isActive = user.status === 'ACTIVE';
        const isChangingStatus = changingStatusId === user.id;
        const isResetting = resettingId === user.id;
        return (
          <Space size="small">
            <Button size="small" onClick={() => onEdit(user)}>Edit</Button>
            <Button
              danger={isActive}
              size="small"
              loading={isChangingStatus}
              disabled={Boolean(changingStatusId) && !isChangingStatus}
              onClick={() => onToggleStatus(user)}
            >
              {isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
            <Button
              size="small"
              loading={isResetting}
              disabled={Boolean(resettingId) && !isResetting}
              onClick={() => onResetPassword(user)}
            >
              Reset password
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table<User>
      rowKey="id"
      columns={columns}
      dataSource={users}
      loading={loading}
      scroll={{ x: 1400 }}
      locale={{ emptyText: <EmptyState description="No users found." /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `${count} users`,
      }}
      onChange={onPaginationChange}
    />
  );
}

function profileCode(user: User) {
  return user.student?.studentCode || user.lecturer?.lecturerCode || '-';
}

function roleColor(role: User['role']) {
  if (role === 'ADMIN') return 'magenta';
  if (role === 'LECTURER') return 'blue';
  return 'cyan';
}
