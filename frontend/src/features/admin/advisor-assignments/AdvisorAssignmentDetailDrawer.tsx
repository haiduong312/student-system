'use client';

import { Descriptions, Drawer, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { QueryState } from '@/components/ui/QueryState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { advisorAssignmentsService } from '@/features/management/advisor-assignments.service';

export function AdvisorAssignmentDetailDrawer({
  assignmentId,
  open,
  onClose,
}: {
  assignmentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['admin', 'advisor-assignments', 'detail', assignmentId],
    queryFn: () => advisorAssignmentsService.getAdvisorAssignmentDetail(assignmentId!),
    enabled: open && Boolean(assignmentId),
  });
  const assignment = query.data;

  return (
    <Drawer title="Advisor assignment details" width={720} open={open} onClose={onClose}>
      <QueryState loading={query.isLoading} error={query.error}>
        {assignment ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4} style={{ marginBottom: 4 }}>
                {assignment.lecturer.user.fullName} → {assignment.student.user.fullName}
              </Typography.Title>
              <StatusBadge status={assignment.status} />
            </div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Lecturer">
                {assignment.lecturer.user.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Lecturer code">
                {assignment.lecturer.lecturerCode}
              </Descriptions.Item>
              <Descriptions.Item label="Department" span={2}>
                {assignment.lecturer.department || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Student">
                {assignment.student.user.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Student code">
                {assignment.student.studentCode}
              </Descriptions.Item>
              <Descriptions.Item label="Class">
                {assignment.student.className || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Major">
                {assignment.student.major || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned by">
                {assignment.assignedBy?.fullName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned at">
                {dayjs(assignment.assignedAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </QueryState>
    </Drawer>
  );
}
