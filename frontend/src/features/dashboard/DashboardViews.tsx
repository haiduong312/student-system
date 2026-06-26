'use client';

import { Alert, Card, Col, List, Progress, Row, Table, Tag } from 'antd';
import { BarChartOutlined, CheckCircleOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import type {
  AdminDashboard,
  DashboardMissingSkill,
  LecturerDashboard,
  StudentDashboard,
} from '@/types/domain';
import { ROADMAP_CURRENT_STATUS } from '@/types/domain';
import {
  getStudentProfileScopeKey,
  useStudentProfileQuery,
} from '@/features/student/profile-context';
import { dashboardService } from './dashboard.service';

type TopMissingSkill = AdminDashboard['topMissingSkills'][number];
type TopCareerGoal = AdminDashboard['topCareerGoals'][number];

export function StudentDashboardView() {
  const profile = useStudentProfileQuery();
  const scopeKey = getStudentProfileScopeKey(profile.data);
  const query = useQuery({
    queryKey: ['dashboard', 'student', ...scopeKey],
    queryFn: () => dashboardService.getStudentDashboard(),
    enabled: profile.isSuccess,
  });
  const roadmapProgress =
    query.data?.roadmapProgress.status === ROADMAP_CURRENT_STATUS
      ? query.data.roadmapProgress
      : null;
  const careerScope = [
    query.data?.careerGoal?.name ?? profile.data?.careerGoal?.name ?? 'No career goal selected',
    profile.data?.specialization?.name,
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <QueryState loading={profile.isLoading || query.isLoading} error={profile.error ?? query.error}>
      <PageHeader title="Student Dashboard" description="Track your competency profile health." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard title="Completion" value={Number(query.data?.completionPercent ?? 0)} suffix="%" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Career Match" value={Number(query.data?.matchPercent ?? 0)} suffix="%" icon={<BarChartOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Roadmap Progress" value={Number(roadmapProgress?.progressPercent ?? 0)} suffix="%" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Missing Skills">
            <List<DashboardMissingSkill>
              dataSource={query.data?.missingSkills ?? []}
              locale={{ emptyText: 'No missing skills from latest analysis.' }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.skill?.name ?? item.skillId}
                    description={`Gap ${item.gap} · Priority ${item.priorityScore}`}
                  />
                  <Tag>{item.status}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Roadmap">
            <Progress percent={Number(roadmapProgress?.progressPercent ?? 0)} />
            <Alert style={{ marginTop: 16 }} type="info" message={careerScope} />
          </Card>
        </Col>
      </Row>
    </QueryState>
  );
}

export function LecturerDashboardView() {
  const query = useQuery({
    queryKey: ['dashboard', 'lecturer'],
    queryFn: () => dashboardService.getLecturerDashboard(),
  });

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Lecturer Dashboard" description="Overview of assigned student profiles." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><MetricCard title="Student Count" value={query.data?.studentCount ?? 0} icon={<TeamOutlined />} /></Col>
        <Col xs={24} md={8}><MetricCard title="Weak Students" value={query.data?.weakStudents ?? 0} icon={<WarningOutlined />} /></Col>
        <Col xs={24} md={8}><MetricCard title="Pending Evidence" value={query.data?.pendingEvidence ?? 0} icon={<CheckCircleOutlined />} /></Col>
      </Row>
    </QueryState>
  );
}

export function AdminDashboardView() {
  const query = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => dashboardService.getAdminDashboard(),
  });

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Admin Dashboard" description="System-wide competency statistics." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}><MetricCard title="Total Students" value={query.data?.totalStudents ?? 0} icon={<TeamOutlined />} /></Col>
        <Col xs={24} md={12}><MetricCard title="Total Lecturers" value={query.data?.totalLecturers ?? 0} icon={<TeamOutlined />} /></Col>
        <Col xs={24} lg={12}>
          <Card title="Top Missing Skills">
            <Table<TopMissingSkill>
              size="small"
              rowKey="skillId"
              pagination={false}
              dataSource={query.data?.topMissingSkills ?? []}
              columns={[
                { title: 'Skill', render: (_value, row) => row.skill?.name ?? row.skillId },
                { title: 'Missing Count', dataIndex: 'missingCount' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Career Goals">
            <Table<TopCareerGoal>
              size="small"
              rowKey={(row) => row.careerGoalId ?? 'none'}
              pagination={false}
              dataSource={query.data?.topCareerGoals ?? []}
              columns={[
                { title: 'Career Goal', render: (_value, row) => row.careerGoal?.name ?? row.careerGoalId },
                { title: 'Students', dataIndex: 'studentCount' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </QueryState>
  );
}
