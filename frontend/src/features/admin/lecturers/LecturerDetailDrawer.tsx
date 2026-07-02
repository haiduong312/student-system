'use client';

import { Descriptions, Drawer, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { QueryState } from '@/components/ui/QueryState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { lecturersService } from '@/features/management/lecturers.service';

export function LecturerDetailDrawer({
  lecturerId,
  open,
  onClose,
}: {
  lecturerId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['admin', 'lecturers', 'detail', lecturerId],
    queryFn: () => lecturersService.getLecturerDetail(lecturerId!),
    enabled: open && Boolean(lecturerId),
  });
  const lecturer = query.data;

  return (
    <Drawer title="Lecturer details" width={680} open={open} onClose={onClose}>
      <QueryState loading={query.isLoading} error={query.error}>
        {lecturer ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 4 }}>
                {lecturer.user.fullName}
              </Typography.Title>
              <Space>
                <Typography.Text type="secondary">{lecturer.user.email}</Typography.Text>
                <StatusBadge status={lecturer.user.status} />
              </Space>
            </div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Lecturer code">
                {lecturer.lecturerCode}
              </Descriptions.Item>
              <Descriptions.Item label="Academic title">
                {lecturer.academicTitle || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {lecturer.department || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">{lecturer.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Last login">
                {formatDate(lecturer.user.lastLoginAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatDate(lecturer.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Last updated" span={2}>
                {formatDate(lecturer.updatedAt)}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </QueryState>
    </Drawer>
  );
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}
