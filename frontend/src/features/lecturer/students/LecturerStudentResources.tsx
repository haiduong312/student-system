'use client';

import { Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import dayjs from 'dayjs';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryState } from '@/components/ui/QueryState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { studentsService } from '@/features/management/students.service';
import type {
  PaginationResponse,
  StudentActivityResource,
  StudentCertificateResource,
  StudentExperienceResource,
  StudentProjectResource,
  StudentSkillResource,
} from '@/types/management';

const DEFAULT_PAGE_SIZE = 10;

export function StudentSkillsTab({ studentId }: { studentId: string }) {
  const columns: TableColumnsType<StudentSkillResource> = [
    {
      title: 'Skill',
      render: (_value, resource) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{resource.skill.name}</Typography.Text>
          <Typography.Text type="secondary">{resource.skill.category?.name || '-'}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Current level', dataIndex: 'currentLevel', width: 120 },
    { title: 'Description', dataIndex: 'description', ellipsis: true, render: valueOrDash },
    {
      title: 'Evidence',
      dataIndex: 'evidenceStatus',
      width: 180,
      render: (status) => <StatusBadge status={status} />,
    },
  ];
  return (
    <ProfileResourceTable
      studentId={studentId}
      resource="skills"
      columns={columns}
      queryFn={(page, limit) => studentsService.getStudentSkills(studentId, { page, limit })}
    />
  );
}

export function StudentProjectsTab({ studentId }: { studentId: string }) {
  const columns: TableColumnsType<StudentProjectResource> = [
    { title: 'Project', dataIndex: 'title' },
    { title: 'Role', dataIndex: 'roleInProject', render: valueOrDash },
    {
      title: 'Technologies',
      dataIndex: 'technologies',
      render: (values: string[]) => values.length ? values.map((value) => <Tag key={value}>{value}</Tag>) : '-',
    },
    { title: 'Status', dataIndex: 'status', width: 130, render: (status) => <Tag>{status}</Tag> },
    {
      title: 'Verification',
      dataIndex: 'verificationStatus',
      width: 180,
      render: (status) => <StatusBadge status={status} />,
    },
  ];
  return (
    <ProfileResourceTable
      studentId={studentId}
      resource="projects"
      columns={columns}
      queryFn={(page, limit) => studentsService.getStudentProjects(studentId, { page, limit })}
    />
  );
}

export function StudentCertificatesTab({ studentId }: { studentId: string }) {
  const columns: TableColumnsType<StudentCertificateResource> = [
    { title: 'Certificate', dataIndex: 'certificateName' },
    { title: 'Issuer', dataIndex: 'issuer', render: valueOrDash },
    { title: 'Issue date', dataIndex: 'issueDate', width: 130, render: formatDate },
    {
      title: 'Verification',
      dataIndex: 'verificationStatus',
      width: 180,
      render: (status) => <StatusBadge status={status} />,
    },
  ];
  return (
    <ProfileResourceTable
      studentId={studentId}
      resource="certificates"
      columns={columns}
      queryFn={(page, limit) => studentsService.getStudentCertificates(studentId, { page, limit })}
    />
  );
}

export function StudentActivitiesTab({ studentId }: { studentId: string }) {
  const columns: TableColumnsType<StudentActivityResource> = [
    { title: 'Activity', dataIndex: 'title' },
    { title: 'Organization', dataIndex: 'organization', render: valueOrDash },
    { title: 'Role', dataIndex: 'role', render: valueOrDash },
    {
      title: 'Verification',
      dataIndex: 'verificationStatus',
      width: 180,
      render: (status) => <StatusBadge status={status} />,
    },
  ];
  return (
    <ProfileResourceTable
      studentId={studentId}
      resource="activities"
      columns={columns}
      queryFn={(page, limit) => studentsService.getStudentActivities(studentId, { page, limit })}
    />
  );
}

export function StudentExperiencesTab({ studentId }: { studentId: string }) {
  const columns: TableColumnsType<StudentExperienceResource> = [
    { title: 'Company', dataIndex: 'companyName' },
    { title: 'Position', dataIndex: 'position' },
    { title: 'Start', dataIndex: 'startDate', width: 110, render: formatDate },
    { title: 'End', dataIndex: 'endDate', width: 110, render: formatDate },
    {
      title: 'Verification',
      dataIndex: 'verificationStatus',
      width: 180,
      render: (status) => <StatusBadge status={status} />,
    },
  ];
  return (
    <ProfileResourceTable
      studentId={studentId}
      resource="experiences"
      columns={columns}
      queryFn={(page, limit) => studentsService.getStudentExperiences(studentId, { page, limit })}
    />
  );
}

function ProfileResourceTable<T extends { id: string }>({
  studentId,
  resource,
  columns,
  queryFn,
}: {
  studentId: string;
  resource: string;
  columns: TableColumnsType<T>;
  queryFn: (page: number, limit: number) => Promise<PaginationResponse<T>>;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const query = useQuery({
    queryKey: ['lecturer', 'students', studentId, resource, page, pageSize],
    queryFn: () => queryFn(page, pageSize),
  });
  const handleChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
  };

  return (
    <QueryState loading={query.isLoading && !query.data} error={query.error}>
      <Table<T>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isFetching}
        scroll={{ x: 760 }}
        locale={{ emptyText: <EmptyState description={`No ${resource} found.`} /> }}
        pagination={{
          current: page,
          pageSize,
          total: query.data?.meta.total ?? 0,
          showSizeChanger: true,
        }}
        onChange={handleChange}
      />
    </QueryState>
  );
}

function valueOrDash(value?: string | null) {
  return value || '-';
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY') : '-';
}
