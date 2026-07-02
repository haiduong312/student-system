'use client';

import { Descriptions, Divider, Drawer, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { QueryState } from '@/components/ui/QueryState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { studentsService } from '@/features/management/students.service';

export function StudentDetailDrawer({
  studentId,
  open,
  onClose,
}: {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['admin', 'students', 'detail', studentId],
    queryFn: () => studentsService.getStudentDetail(studentId!),
    enabled: open && Boolean(studentId),
  });
  const student = query.data;

  return (
    <Drawer title="Student details" width={760} open={open} onClose={onClose}>
      <QueryState loading={query.isLoading} error={query.error}>
        {student ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 4 }}>
                {student.user.fullName}
              </Typography.Title>
              <Space>
                <Typography.Text type="secondary">{student.user.email}</Typography.Text>
                <StatusBadge status={student.user.status} />
              </Space>
            </div>

            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Student code">{student.studentCode}</Descriptions.Item>
              <Descriptions.Item label="Class">{student.className || '-'}</Descriptions.Item>
              <Descriptions.Item label="Major">{student.major || '-'}</Descriptions.Item>
              <Descriptions.Item label="Academic year">
                {student.academicYear || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">{student.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date of birth">
                {formatDate(student.dateOfBirth, 'DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Last login">
                {formatDate(student.user.lastLoginAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Created">{formatDate(student.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Avatar URL" span={2}>
                <OptionalLink value={student.avatarUrl} />
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Divider orientation="left">Profile</Divider>
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Career goal">
                  {student.profile?.careerGoal?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Specialization">
                  {student.profile?.specialization?.name || 'General'}
                </Descriptions.Item>
                <Descriptions.Item label="Completion">
                  {student.profile ? `${Number(student.profile.completionPercent)}%` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Career match">
                  {student.profile ? `${Number(student.profile.matchPercent)}%` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Summary" span={2}>
                  {student.profile?.summary || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="GitHub">
                  <OptionalLink value={student.profile?.githubUrl} />
                </Descriptions.Item>
                <Descriptions.Item label="LinkedIn">
                  <OptionalLink value={student.profile?.linkedinUrl} />
                </Descriptions.Item>
                <Descriptions.Item label="Portfolio" span={2}>
                  <OptionalLink value={student.profile?.portfolioUrl} />
                </Descriptions.Item>
              </Descriptions>
            </div>
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
