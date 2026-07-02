'use client';

import { Descriptions, Drawer, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { QueryState } from '@/components/ui/QueryState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usersService } from '@/features/management/users.service';

export function UserDetailDrawer({
  userId,
  open,
  onClose,
}: {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['admin', 'users', 'detail', userId],
    queryFn: () => usersService.getUserDetail(userId!),
    enabled: open && Boolean(userId),
  });
  const user = query.data;

  return (
    <Drawer title="User details" width={760} open={open} onClose={onClose}>
      <QueryState loading={query.isLoading} error={query.error}>
        {user ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 4 }}>
                {user.fullName}
              </Typography.Title>
              <Space>
                <Typography.Text type="secondary">{user.email}</Typography.Text>
                <Tag>{user.role}</Tag>
                <StatusBadge status={user.status} />
              </Space>
            </div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Role">{user.role}</Descriptions.Item>
              <Descriptions.Item label="Status"><StatusBadge status={user.status} /></Descriptions.Item>
              <Descriptions.Item label="Last login">{formatDate(user.lastLoginAt)}</Descriptions.Item>
              <Descriptions.Item label="Created">{formatDate(user.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Last updated" span={2}>{formatDate(user.updatedAt)}</Descriptions.Item>
            </Descriptions>
            {user.student ? (
              <Descriptions title="Student profile" bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Student code">{user.student.studentCode}</Descriptions.Item>
                <Descriptions.Item label="Class">{user.student.className || '-'}</Descriptions.Item>
                <Descriptions.Item label="Major">{user.student.major || '-'}</Descriptions.Item>
                <Descriptions.Item label="Academic year">{user.student.academicYear || '-'}</Descriptions.Item>
                <Descriptions.Item label="Phone">{user.student.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="Date of birth">
                  {formatDate(user.student.dateOfBirth, 'DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Career goal">
                  {user.student.profile?.careerGoal?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Specialization">
                  {user.student.profile?.specialization?.name || 'General'}
                </Descriptions.Item>
                <Descriptions.Item label="Avatar URL" span={2}>
                  <OptionalLink value={user.student.avatarUrl} />
                </Descriptions.Item>
              </Descriptions>
            ) : null}
            {user.lecturer ? (
              <Descriptions title="Lecturer profile" bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Lecturer code">{user.lecturer.lecturerCode}</Descriptions.Item>
                <Descriptions.Item label="Academic title">{user.lecturer.academicTitle || '-'}</Descriptions.Item>
                <Descriptions.Item label="Department">{user.lecturer.department || '-'}</Descriptions.Item>
                <Descriptions.Item label="Phone">{user.lecturer.phone || '-'}</Descriptions.Item>
              </Descriptions>
            ) : null}
          </Space>
        ) : null}
      </QueryState>
    </Drawer>
  );
}

function formatDate(value?: string | null, format = 'DD/MM/YYYY HH:mm') {
  return value ? dayjs(value).format(format) : '-';
}

function OptionalLink({ value }: { value?: string | null }) {
  return value ? (
    <Typography.Link href={value} target="_blank" rel="noreferrer" ellipsis>
      {value}
    </Typography.Link>
  ) : (
    <>-</>
  );
}
