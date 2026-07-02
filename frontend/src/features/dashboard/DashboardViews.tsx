'use client';

import { Alert, Button, Card, Col, List, Progress, Row, Table, Tag, Typography } from 'antd';
import { BarChartOutlined, CheckCircleOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { EmptyState } from '@/components/ui/EmptyState';
import { CurrentGoalCard } from '@/components/ui/CurrentGoalCard';
import { isActiveRoadmap } from '@/lib/status';
import type {
  AnalysisHistoryItem,
  AdminDashboard,
  DashboardMissingSkill,
} from '@/types/domain';
import { ANALYSIS_CURRENT_STATUS } from '@/types/domain';
import {
  isSameProfileScope,
  studentQueryKeys,
  useCurrentProfileContext,
} from '@/features/student/profile-context';
import { analysisService } from '@/features/student/analysis.service';
import { dashboardService } from './dashboard.service';

type TopMissingSkill = AdminDashboard['topMissingSkills'][number];
type TopCareerGoal = AdminDashboard['topCareerGoals'][number];

export function StudentDashboardView() {
  const context = useCurrentProfileContext();
  const query = useQuery({
    queryKey: studentQueryKeys.dashboardStudent(context.scopeKey),
    queryFn: () => dashboardService.getStudentDashboard(),
    enabled: context.isContextReady,
  });
  const analysisHistory = useQuery({
    queryKey: studentQueryKeys.analysisHistory,
    queryFn: () => analysisService.listMyHistory(),
    enabled: context.isContextReady,
  });
  const currentAnalysis = (analysisHistory.data?.data ?? []).find(
    (item) => item.status === ANALYSIS_CURRENT_STATUS && isSameProfileScope(context.profile, item),
  );
  const roadmapProgress = isActiveRoadmap(query.data?.roadmapProgress?.status)
    ? query.data?.roadmapProgress
    : null;
  const careerScope = [
    query.data?.careerGoal?.name ?? context.careerGoalName ?? 'No career goal selected',
    context.specializationName ?? 'General',
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <QueryState
      loading={
        context.loading ||
        (context.isContextReady && (query.isLoading || analysisHistory.isLoading))
      }
      error={context.error ?? query.error ?? analysisHistory.error}
    >
      <PageHeader title="Student Dashboard" description="Track your competency profile health." />
      {!context.isContextReady ? (
        <Card>
          <EmptyState description="Select a career goal in your profile to load dashboard data for the current context.">
            <Button type="primary" href="/student/profile">
              Update Profile
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <CurrentGoalCard
              contextLabel={careerScope}
              tone={currentAnalysis ? 'success' : 'info'}
              description={
                currentAnalysis
                  ? 'Dashboard metrics are scoped to the current profile context.'
                  : 'Complete an assessment and run analysis to populate current competency data.'
              }
              action={
                currentAnalysis ? null : (
                  <Button size="small" href="/student/assessment">
                    Do Assessment
                  </Button>
                )
              }
            />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard title="Completion" value={Number(query.data?.completionPercent ?? 0)} suffix="%" icon={<CheckCircleOutlined />} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard title="Career Match" value={Number(query.data?.matchPercent ?? 0)} suffix="%" icon={<BarChartOutlined />} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard title="Roadmap Progress" value={Number(roadmapProgress?.progressPercent ?? 0)} suffix="%" icon={<CheckCircleOutlined />} />
          </Col>
          <Col xs={24}>
            <DashboardSummary
              analysis={currentAnalysis}
              missingSkills={query.data?.missingSkills ?? []}
            />
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
              {roadmapProgress ? (
                <>
                  <Progress percent={Number(roadmapProgress.progressPercent ?? 0)} />
                  <Alert
                    style={{ marginTop: 16 }}
                    type="success"
                    message="Active roadmap"
                    description={`${roadmapProgress.itemCount} items in progress for ${careerScope}.`}
                  />
                </>
              ) : (
                <EmptyState description="No active roadmap for the current context.">
                  <Button type="primary" href="/student/roadmap">
                    Generate Roadmap
                  </Button>
                </EmptyState>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </QueryState>
  );
}

function DashboardSummary({
  analysis,
  missingSkills,
}: {
  analysis?: AnalysisHistoryItem;
  missingSkills: DashboardMissingSkill[];
}) {
  if (!analysis) {
    return (
      <Card>
        <EmptyState description="No current analysis for this career goal and specialization.">
          <Button type="primary" href="/student/analysis">
            Analyze Now
          </Button>
        </EmptyState>
      </Card>
    );
  }

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Competency Summary
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard title="Match Level" value={analysis.matchLevel} icon={<BarChartOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Current Match" value={Number(analysis.matchPercent)} suffix="%" icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard title="Skill Gaps" value={missingSkills.length} icon={<WarningOutlined />} />
        </Col>
      </Row>
    </div>
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
