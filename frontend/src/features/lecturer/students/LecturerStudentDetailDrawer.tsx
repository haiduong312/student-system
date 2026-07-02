'use client';

import { Descriptions, Drawer, Space, Tabs, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { QueryState } from '@/components/ui/QueryState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { studentsService } from '@/features/management/students.service';
import type { ManagedStudentProfile, Student } from '@/types/management';
import {
  StudentActivitiesTab,
  StudentCertificatesTab,
  StudentExperiencesTab,
  StudentProjectsTab,
  StudentSkillsTab,
} from './LecturerStudentResources';

export function LecturerStudentDetailDrawer({
  studentId,
  open,
  onClose,
}: {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['lecturer', 'students', 'detail', studentId],
    queryFn: () => studentsService.getStudentDetail(studentId!),
    enabled: open && Boolean(studentId),
  });
  const profile = useQuery({
    queryKey: ['lecturer', 'students', 'profile', studentId],
    queryFn: () => studentsService.getStudentProfile(studentId!),
    enabled: open && Boolean(studentId),
  });

  return (
    <Drawer title="Assigned student details" width={980} open={open} onClose={onClose}>
      <QueryState
        loading={detail.isLoading || profile.isLoading}
        error={detail.error ?? profile.error}
      >
        {detail.data && profile.data && studentId ? (
          <Tabs
            key={studentId}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: <StudentOverview student={detail.data} profile={profile.data} />,
              },
              { key: 'skills', label: 'Skills', children: <StudentSkillsTab studentId={studentId} /> },
              { key: 'projects', label: 'Projects', children: <StudentProjectsTab studentId={studentId} /> },
              {
                key: 'certificates',
                label: 'Certificates',
                children: <StudentCertificatesTab studentId={studentId} />,
              },
              {
                key: 'activities',
                label: 'Activities',
                children: <StudentActivitiesTab studentId={studentId} />,
              },
              {
                key: 'experiences',
                label: 'Experiences',
                children: <StudentExperiencesTab studentId={studentId} />,
              },
            ]}
          />
        ) : null}
      </QueryState>
    </Drawer>
  );
}

function StudentOverview({
  student,
  profile,
}: {
  student: Student;
  profile: ManagedStudentProfile;
}) {
  return (
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
      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
        <Descriptions.Item label="Student code">{student.studentCode}</Descriptions.Item>
        <Descriptions.Item label="Class">{student.className || '-'}</Descriptions.Item>
        <Descriptions.Item label="Major">{student.major || '-'}</Descriptions.Item>
        <Descriptions.Item label="Academic year">{student.academicYear || '-'}</Descriptions.Item>
        <Descriptions.Item label="Phone">{student.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="Date of birth">
          {formatDate(student.dateOfBirth, 'DD/MM/YYYY')}
        </Descriptions.Item>
      </Descriptions>
      <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Career goal">
          {profile.careerGoal?.name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Specialization">
          {profile.specialization?.name || 'General'}
        </Descriptions.Item>
        <Descriptions.Item label="Completion">
          {Number(profile.completionPercent)}%
        </Descriptions.Item>
        <Descriptions.Item label="Career match">
          {Number(profile.matchPercent)}%
        </Descriptions.Item>
        <Descriptions.Item label="Risk score">{profile.riskScore}</Descriptions.Item>
        <Descriptions.Item label="Last analyzed">
          {formatDate(profile.lastAnalyzedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Summary" span={2}>
          {profile.summary || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="GitHub"><OptionalLink value={profile.githubUrl} /></Descriptions.Item>
        <Descriptions.Item label="LinkedIn"><OptionalLink value={profile.linkedinUrl} /></Descriptions.Item>
        <Descriptions.Item label="Portfolio" span={2}>
          <OptionalLink value={profile.portfolioUrl} />
        </Descriptions.Item>
      </Descriptions>
    </Space>
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
