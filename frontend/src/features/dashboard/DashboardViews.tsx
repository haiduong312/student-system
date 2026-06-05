'use client';

import { Alert, Card, Col, List, Progress, Row, Table, Tag } from 'antd';
import { BarChartOutlined, CheckCircleOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getData } from '@/lib/request';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';

export function StudentDashboardView() {
  const query = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: () => getData<any>('/dashboard/student'),
  });

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Student Dashboard" description="Track your competency profile health." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard title="Completion" value={Number(query.data?.completionPercent ?? 0)} suffix="%" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Career Match" value={Number(query.data?.matchPercent ?? 0)} suffix="%" icon={<BarChartOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Roadmap Progress" value={Number(query.data?.roadmapProgress?.progressPercent ?? 0)} suffix="%" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Missing Skills">
            <List
              dataSource={query.data?.missingSkills ?? []}
              locale={{ emptyText: 'No missing skills from latest analysis.' }}
              renderItem={(item: any) => (
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
            <Progress percent={Number(query.data?.roadmapProgress?.progressPercent ?? 0)} />
            <Alert style={{ marginTop: 16 }} type="info" message={query.data?.careerGoal?.name ?? 'No career goal selected'} />
          </Card>
        </Col>
      </Row>
    </QueryState>
  );
}

export function LecturerDashboardView() {
  const query = useQuery({
    queryKey: ['dashboard', 'lecturer'],
    queryFn: () => getData<any>('/dashboard/lecturer'),
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
    queryFn: () => getData<any>('/dashboard/admin'),
  });

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Admin Dashboard" description="System-wide competency statistics." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}><MetricCard title="Total Students" value={query.data?.totalStudents ?? 0} icon={<TeamOutlined />} /></Col>
        <Col xs={24} md={12}><MetricCard title="Total Lecturers" value={query.data?.totalLecturers ?? 0} icon={<TeamOutlined />} /></Col>
        <Col xs={24} lg={12}>
          <Card title="Top Missing Skills">
            <Table
              size="small"
              rowKey="skillId"
              pagination={false}
              dataSource={query.data?.topMissingSkills ?? []}
              columns={[
                { title: 'Skill', render: (_value: unknown, row: any) => row.skill?.name ?? row.skillId },
                { title: 'Missing Count', dataIndex: 'missingCount' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Career Goals">
            <Table
              size="small"
              rowKey="careerGoalId"
              pagination={false}
              dataSource={query.data?.topCareerGoals ?? []}
              columns={[
                { title: 'Career Goal', render: (_value: unknown, row: any) => row.careerGoal?.name ?? row.careerGoalId },
                { title: 'Students', dataIndex: 'studentCount' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </QueryState>
  );
}
