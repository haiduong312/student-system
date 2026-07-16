'use client';

import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Grid,
  Input,
  List,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  theme,
  Typography,
} from 'antd';
import { CheckOutlined, ClockCircleOutlined, UndoOutlined } from '@ant-design/icons';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect, useState, type CSSProperties } from 'react';
import { getPage, patchData } from '@/lib/request';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { isActionableRecommendation } from '@/lib/status';
import type {
  AnalysisHistoryItem,
  AnalysisResultDetail,
  AnalysisResultSkillDetail,
  CareerGoal,
  CompetencyAnalysis,
  Evidence,
  EvidenceStatus,
  NotificationItem,
  Paginated,
  Recommendation,
  RecommendationResource,
  ResourceProgressStatus,
  Specialization,
  StudentRecommendationStatus,
} from '@/types/domain';
import { ANALYSIS_CURRENT_STATUS } from '@/types/domain';
import {
  invalidateStudentCurrentContextQueries,
  isSameProfileScope,
  studentQueryKeys,
  useCurrentProfileContext,
} from './profile-context';
import { analysisService } from './analysis.service';
import { evidenceService } from './evidence.service';
import { learningResourceService } from './learning-resource.service';
import { recommendationService } from './recommendation.service';
import { RecommendationTree } from './RecommendationTree';
import { SelectedRoadmap } from './SelectedRoadmap';

type AnalysisSkill = CompetencyAnalysis['skills'][number];
type RecommendationFilter = 'active' | 'done' | 'dismissed';
type NotificationTypePresentation = {
  color: string;
  label: string;
};

const NOTIFICATION_TYPE_PRESENTATION: Record<
  NotificationItem['notificationType'],
  NotificationTypePresentation
> = {
  PROFILE_REMINDER: { color: 'blue', label: 'Profile reminder' },
  EVIDENCE_VERIFIED: { color: 'green', label: 'Evidence verified' },
  EVIDENCE_REJECTED: { color: 'red', label: 'Evidence rejected' },
  ROADMAP_REMINDER: { color: 'orange', label: 'Roadmap reminder' },
  ADVISOR_REVIEW: { color: 'purple', label: 'Advisor review' },
  WEAK_PROFILE_ALERT: { color: 'volcano', label: 'Profile alert' },
  SYSTEM: { color: 'cyan', label: 'System' },
};

const RECOMMENDATION_FILTER_LABEL: Record<RecommendationFilter, string> = {
  active: 'Active',
  done: 'Done',
  dismissed: 'Dismissed',
};

const RECOMMENDATION_FILTER_STATUS: Partial<
  Record<RecommendationFilter, StudentRecommendationStatus>
> = {
  done: 'DONE',
  dismissed: 'DISMISSED',
};

export function StudentEvidencesView() {
  const query = useQuery({
    queryKey: studentQueryKeys.evidencesMe,
    queryFn: () => evidenceService.listMine(),
  });
  return <EvidenceTable title="Evidences" query={query} />;
}

export function LecturerEvidenceReviewView() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: studentQueryKeys.evidencesPending,
    queryFn: () => evidenceService.listPending(),
  });
  const verify = useMutation({
    mutationFn: ({ id, currentLevel }: { id: string; currentLevel?: number }) =>
      evidenceService.verify(id, currentLevel),
    onSuccess: () => {
      message.success('Verified');
      queryClient.invalidateQueries({ queryKey: ['evidences'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const reject = useMutation({
    mutationFn: ({ id, reviewerNote }: { id: string; reviewerNote: string }) =>
      evidenceService.reject(id, reviewerNote),
    onSuccess: () => {
      message.success('Rejected');
      queryClient.invalidateQueries({ queryKey: ['evidences'] });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const handleVerify = (row: Evidence) => {
    if (row.relatedEntityType !== 'SKILL') {
      verify.mutate({ id: row.id });
      return;
    }

    let currentLevel: number | undefined;
    modal.confirm({
      title: 'Verify skill evidence',
      content: (
        <Select<number>
          style={{ width: '100%' }}
          placeholder="Current level"
          onChange={(value) => {
            currentLevel = value;
          }}
          options={[0, 1, 2, 3].map((value) => ({
            value,
            label: String(value),
          }))}
        />
      ),
      okText: 'Verify',
      onOk: () => {
        if (currentLevel === undefined) {
          message.error('Select current level');
          return Promise.reject();
        }

        verify.mutate({ id: row.id, currentLevel });
        return undefined;
      },
    });
  };

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Pending Evidences" />
      <Table<Evidence>
        rowKey="id"
        dataSource={query.data?.data ?? []}
        columns={[
          {
            title: 'Student',
            render: (_value, row) => row.student?.user?.fullName ?? row.student?.studentCode,
          },
          { title: 'Entity', dataIndex: 'relatedEntityType' },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
          { title: 'Note', dataIndex: 'note' },
          { title: 'Evidence', render: (_value, row) => <EvidenceFileAction evidence={row} /> },
          {
            title: 'Actions',
            render: (_value, row) => (
              <Space>
                <Button loading={verify.isPending} onClick={() => handleVerify(row)}>
                  Verify
                </Button>
                <Button
                  danger
                  loading={reject.isPending}
                  onClick={() => {
                    let reviewerNote = '';
                    modal.confirm({
                      title: 'Reject evidence',
                      content: (
                        <Input.TextArea
                          rows={3}
                          maxLength={1000}
                          placeholder="Reason"
                          onChange={(event) => {
                            reviewerNote = event.target.value;
                          }}
                        />
                      ),
                      okText: 'Reject',
                      onOk: () =>
                        new Promise<void>((resolve, rejectPromise) => {
                          if (!reviewerNote.trim()) {
                            message.error('A rejection reason is required.');
                            rejectPromise();
                            return;
                          }

                          reject.mutate(
                            {
                              id: row.id,
                              reviewerNote: reviewerNote.trim(),
                            },
                            {
                              onSuccess: () => resolve(),
                              onError: () => rejectPromise(),
                            },
                          );
                        }),
                    });
                  }}
                >
                  Reject
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </QueryState>
  );
}

export function RecommendationsView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const context = useCurrentProfileContext();
  const [filter, setFilter] = useState<RecommendationFilter>('active');
  const query = useQuery({
    queryKey: studentQueryKeys.recommendationsMe(context.scopeKey, filter),
    queryFn: () =>
      recommendationService.listMine({
        status: RECOMMENDATION_FILTER_STATUS[filter],
        limit: 100,
      }),
    enabled: context.isContextReady,
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StudentRecommendationStatus }) =>
      recommendationService.updateStatus(id, status),
    onSuccess: () => {
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const recommendations = (query.data?.data ?? []).filter((item) =>
    filter === 'active'
      ? isActionableRecommendation(item.status)
      : item.status === RECOMMENDATION_FILTER_STATUS[filter],
  );

  return (
    <QueryState
      loading={context.loading || (context.isContextReady && query.isLoading)}
      error={context.error ?? query.error}
    >
      <PageHeader title="Recommendations" />
      <CareerScopeSummary
        careerGoal={context.profile?.careerGoal}
        specialization={context.profile?.specialization}
        style={{ marginBottom: 16 }}
      />
      {!context.isContextReady ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="Please select a career goal before viewing recommendations."
        />
      ) : null}
      <Tabs
        activeKey={filter}
        onChange={(key) => setFilter(key as RecommendationFilter)}
        items={(Object.keys(RECOMMENDATION_FILTER_LABEL) as RecommendationFilter[]).map(
          (key) => ({
            key,
            label: RECOMMENDATION_FILTER_LABEL[key],
          }),
        )}
      />
      <RecommendationTree
        recommendations={recommendations}
        emptyDescription={
          filter === 'active'
            ? 'Chưa có gợi ý học tập. Hãy hoàn thành phân tích năng lực trước.'
            : `No ${RECOMMENDATION_FILTER_LABEL[filter].toLowerCase()} recommendations.`
        }
        showAnalysisAction={filter === 'active'}
        updating={update.isPending}
        onAddToRoadmap={(recommendation) =>
          update.mutate(
            { id: recommendation.id, status: 'SAVED' },
            { onSuccess: () => message.success('Added to Roadmap.') },
          )
        }
        onDismiss={(recommendation) =>
          update.mutate(
            { id: recommendation.id, status: 'DISMISSED' },
            { onSuccess: () => message.success('Recommendation dismissed.') },
          )
        }
      />
    </QueryState>
  );
}

export function RoadmapView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const context = useCurrentProfileContext();
  const selectedRecommendations = useQuery({
    queryKey: [...studentQueryKeys.recommendationsMe(context.scopeKey, 'roadmap-selected')],
    queryFn: async () =>
      recommendationService
        .listMine({ limit: 100 })
        .then((page) =>
          page.data.filter((item) =>
            ['SAVED', 'IN_PROGRESS', 'DONE'].includes(item.status),
          ),
        ),
    enabled: context.isContextReady,
  });
  const updateRecommendation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StudentRecommendationStatus }) =>
      recommendationService.updateStatus(id, status),
    onSuccess: () => {
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const updateResourceProgress = useMutation({
    mutationFn: ({
      resource,
      recommendationId,
      status,
    }: {
      resource: RecommendationResource;
      recommendationId: string;
      status: ResourceProgressStatus;
    }) =>
      learningResourceService.updateProgress(resource.resourceId, {
        status,
        recommendationId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentQueryKeys.learningResourceProgress(context.scopeKey),
      });
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  return (
    <QueryState
      loading={
        context.loading || (context.isContextReady && selectedRecommendations.isLoading)
      }
      error={context.error ?? selectedRecommendations.error}
    >
      <PageHeader
        title="Roadmap"
        description="A focused timeline containing only recommendations you selected."
      />
      <CareerScopeSummary
        careerGoal={context.profile?.careerGoal}
        specialization={context.profile?.specialization}
        style={{ marginBottom: 16 }}
      />
      {!context.isContextReady ? (
        <Card>
          <EmptyState description="Select a career goal in your profile before viewing your roadmap." />
        </Card>
      ) : (
        <SelectedRoadmap
          recommendations={selectedRecommendations.data ?? []}
          updatingStatus={updateRecommendation.isPending}
          updatingResource={updateResourceProgress.isPending}
          onStatusChange={(recommendation, status) =>
            updateRecommendation.mutate({ id: recommendation.id, status })
          }
          onResourceProgressChange={(resource, recommendationId, status) =>
            updateResourceProgress.mutate({ resource, recommendationId, status })
          }
        />
      )}
    </QueryState>
  );
}

export function NotificationsView() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: studentQueryKeys.notificationsMe,
    queryFn: () => getPage<NotificationItem>('/notifications/me', { limit: 50 }),
  });
  const updateReadState = useMutation({
    mutationFn: ({ id, markAsRead }: { id: string; markAsRead: boolean }) =>
      patchData(`/notifications/${id}/${markAsRead ? 'read' : 'unread'}`, {}),
    onSuccess: (_data, variables) => {
      message.success(
        variables.markAsRead
          ? 'Notification marked as read.'
          : 'Notification marked as unread.',
      );
      return queryClient.invalidateQueries({ queryKey: studentQueryKeys.notificationsMe });
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const notifications = query.data?.data ?? [];

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader
        title="Notifications"
        description="Stay up to date with profile reminders, evidence reviews, roadmap activity, and system updates."
      />
      <Card title="Recent notifications" styles={{ body: { padding: 0 } }}>
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          locale={{
            emptyText: (
              <EmptyState description="You do not have any notifications yet." />
            ),
          }}
          renderItem={(item) => {
            const presentation = NOTIFICATION_TYPE_PRESENTATION[item.notificationType];
            const isUpdating =
              updateReadState.isPending && updateReadState.variables?.id === item.id;
            const actionLabel = item.isRead ? 'Mark as unread' : 'Mark as read';
            const isCompact = !screens.sm;
            const readStateAction = (
              <Button
                key="read-state"
                type={item.isRead ? 'default' : 'primary'}
                size="small"
                block={isCompact}
                icon={item.isRead ? <UndoOutlined /> : <CheckOutlined />}
                loading={isUpdating}
                disabled={updateReadState.isPending && !isUpdating}
                aria-label={`${actionLabel}: ${item.title}`}
                onClick={() =>
                  updateReadState.mutate({
                    id: item.id,
                    markAsRead: !item.isRead,
                  })
                }
              >
                {actionLabel}
              </Button>
            );

            return (
              <List.Item
                style={{
                  background: item.isRead ? token.colorBgContainer : token.colorPrimaryBg,
                  borderInlineStart: `3px solid ${
                    item.isRead ? 'transparent' : token.colorPrimary
                  }`,
                  padding: '16px 20px',
                }}
                actions={isCompact ? undefined : [readStateAction]}
              >
                <List.Item.Meta
                  style={{ minWidth: 0 }}
                  title={
                    <Space size={[8, 8]} wrap>
                      <Badge status={item.isRead ? 'default' : 'processing'} />
                      <Typography.Text strong={!item.isRead}>{item.title}</Typography.Text>
                      <Tag color={presentation.color}>{presentation.label}</Tag>
                      <Tag color={item.isRead ? 'default' : 'processing'}>
                        {item.isRead ? 'Read' : 'Unread'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Typography.Paragraph style={{ margin: 0 }}>
                        {item.content}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        <ClockCircleOutlined style={{ marginInlineEnd: 6 }} />
                        {formatDateTime(item.createdAt)}
                      </Typography.Text>
                      {isCompact ? readStateAction : null}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>
    </QueryState>
  );
}

export function AnalysisView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const context = useCurrentProfileContext();
  const history = useQuery({
    queryKey: studentQueryKeys.analysisHistory,
    queryFn: () => analysisService.listMyHistory(),
    enabled: context.isContextReady,
  });
  const currentAnalysis = (history.data?.data ?? []).find(
    (item) => item.status === ANALYSIS_CURRENT_STATUS && isSameProfileScope(context.profile, item),
  );
  const currentDetail = useQuery({
    queryKey: studentQueryKeys.analysisCurrent(context.scopeKey),
    queryFn: () => {
      if (!currentAnalysis) {
        throw new Error('No current analysis is available.');
      }

      return analysisService.getResult(currentAnalysis.id);
    },
    enabled: context.isContextReady && Boolean(currentAnalysis),
  });
  const analyze = useMutation({
    mutationFn: () => analysisService.analyzeMine(),
    onSuccess: () => {
      message.success('Analysis completed');
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const resetAnalysis = analyze.reset;

  useEffect(() => {
    resetAnalysis();
  }, [context.careerGoalId, context.specializationId, resetAnalysis]);

  return (
    <QueryState
      loading={
        context.loading ||
        (context.isContextReady && (history.isLoading || currentDetail.isLoading))
      }
      error={context.error ?? history.error ?? currentDetail.error}
    >
      <PageHeader title="Competency Analysis" />
      <Card>
        <CareerScopeSummary
          careerGoal={context.profile?.careerGoal}
          specialization={context.profile?.specialization}
        />
        {!context.isContextReady ? (
          <Alert
            showIcon
            type="warning"
            style={{ marginTop: 16 }}
            message="Please select a career goal before running analysis."
          />
        ) : null}
        <Space style={{ marginTop: 16, marginBottom: 16 }}>
          <Button
            type="primary"
            loading={analyze.isPending}
            disabled={!context.isContextReady}
            onClick={() => analyze.mutate()}
          >
            Analyze Now
          </Button>
          <Button href="/student/assessment">
            Go to Assessment
          </Button>
        </Space>
        {analyze.error ? (
          <Alert
            showIcon
            type="warning"
            style={{ marginBottom: 16 }}
            message={getApiErrorMessage(analyze.error)}
            action={<Button href="/student/assessment">Do assessment</Button>}
          />
        ) : null}
        {analyze.data ? (
          <AnalysisResultDetails
            analysis={analyze.data}
            status={ANALYSIS_CURRENT_STATUS}
          />
        ) : currentDetail.data ? (
          <AnalysisResultDetailView analysis={currentDetail.data} />
        ) : currentAnalysis ? (
          <CurrentAnalysisSummary analysis={currentAnalysis} />
        ) : (
          <AssessmentRequiredEmpty />
        )}
      </Card>
      {context.isContextReady ? (
        <Card title="Analysis History" style={{ marginTop: 16 }}>
          <Table<AnalysisHistoryItem>
            rowKey="id"
            size="small"
            dataSource={history.data?.data ?? []}
            pagination={false}
            columns={[
              {
                title: 'Scope',
                render: (_value, row) =>
                  `${row.careerGoal?.name ?? row.careerGoalId} / ${
                    row.specialization?.name ?? 'General'
                  }`,
              },
              { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge status={value} /> },
              {
                title: 'Match',
                render: (_value, row) => `${Number(row.matchPercent)}%`,
              },
              { title: 'Level', dataIndex: 'matchLevel' },
              { title: 'Analyzed At', render: (_value, row) => formatDateTime(row.analyzedAt) },
            ]}
          />
        </Card>
      ) : null}
    </QueryState>
  );
}

function AnalysisResultDetails({
  analysis,
  status,
}: {
  analysis: CompetencyAnalysis;
  status: typeof ANALYSIS_CURRENT_STATUS;
}) {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
        <Descriptions.Item label="Status">
          <StatusBadge status={status} />
        </Descriptions.Item>
        <Descriptions.Item label="Career Goal">{analysis.careerGoal}</Descriptions.Item>
        <Descriptions.Item label="Specialization">
          {analysis.specialization ?? 'General'}
        </Descriptions.Item>
        <Descriptions.Item label="Completion">
          {analysis.completionPercent}%
        </Descriptions.Item>
        <Descriptions.Item label="Match">{analysis.matchPercent}%</Descriptions.Item>
        <Descriptions.Item label="Risk Score">{analysis.riskScore}</Descriptions.Item>
        <Descriptions.Item label="Level">{analysis.matchLevel}</Descriptions.Item>
      </Descriptions>
      <Table<AnalysisSkill>
        rowKey="skillId"
        size="small"
        dataSource={analysis.skills}
        pagination={false}
        columns={[
          { title: 'Skill', dataIndex: 'skillName' },
          { title: 'Current', dataIndex: 'currentLevel' },
          { title: 'Required', dataIndex: 'requiredLevel' },
          { title: 'Gap', dataIndex: 'gap' },
          { title: 'Priority', dataIndex: 'priorityScore' },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
        ]}
      />
    </Space>
  );
}

function AnalysisResultDetailView({ analysis }: { analysis: AnalysisResultDetail }) {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
        <Descriptions.Item label="Status">
          <StatusBadge status={analysis.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Career Goal">
          {analysis.careerGoal?.name ?? analysis.careerGoalId}
        </Descriptions.Item>
        <Descriptions.Item label="Specialization">
          {analysis.specialization?.name ?? 'General'}
        </Descriptions.Item>
        <Descriptions.Item label="Completion">
          {Number(analysis.completionPercent)}%
        </Descriptions.Item>
        <Descriptions.Item label="Match">
          {Number(analysis.matchPercent)}%
        </Descriptions.Item>
        <Descriptions.Item label="Risk Score">{analysis.riskScore}</Descriptions.Item>
        <Descriptions.Item label="Level">{analysis.matchLevel}</Descriptions.Item>
        <Descriptions.Item label="Analyzed At">
          {formatDateTime(analysis.analyzedAt)}
        </Descriptions.Item>
      </Descriptions>
      <Table<AnalysisResultSkillDetail>
        rowKey={(row) => row.id ?? row.skillId}
        size="small"
        dataSource={analysis.details}
        pagination={false}
        columns={[
          { title: 'Skill', render: (_value, row) => row.skill?.name ?? row.skillId },
          { title: 'Category', render: (_value, row) => row.skill?.category?.name ?? '-' },
          { title: 'Current', dataIndex: 'currentLevel' },
          { title: 'Required', dataIndex: 'requiredLevel' },
          { title: 'Gap', dataIndex: 'gap' },
          { title: 'Priority', render: (_value, row) => Number(row.priorityScore) },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
        ]}
      />
      <Typography.Title level={5} style={{ margin: 0 }}>
        Recommendations
      </Typography.Title>
      <div>
        <List<Recommendation>
          dataSource={analysis.recommendations}
          locale={{ emptyText: 'No recommendations for this analysis.' }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space wrap>
                    {item.title}
                    <StatusBadge status={item.status} />
                  </Space>
                }
                description={`${item.skill?.name ?? item.skillId ?? ''} · Priority ${
                  item.priorityScore
                }`}
              />
            </List.Item>
          )}
        />
      </div>
    </Space>
  );
}

function CurrentAnalysisSummary({ analysis }: { analysis: AnalysisHistoryItem }) {
  return (
    <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
      <Descriptions.Item label="Lifecycle">
        <StatusBadge status={analysis.status} />
      </Descriptions.Item>
      <Descriptions.Item label="Match">{Number(analysis.matchPercent)}%</Descriptions.Item>
      <Descriptions.Item label="Level">{analysis.matchLevel}</Descriptions.Item>
      <Descriptions.Item label="Analyzed At">
        {formatDateTime(analysis.analyzedAt)}
      </Descriptions.Item>
    </Descriptions>
  );
}

function AssessmentRequiredEmpty() {
  return (
    <EmptyState description="Bạn cần hoàn thành assessment để xem phân tích năng lực.">
      <Button type="primary" href="/student/assessment">
        Làm assessment
      </Button>
    </EmptyState>
  );
}

function CareerScopeSummary({
  careerGoal,
  specialization,
  style,
}: {
  careerGoal?: CareerGoal | string | null;
  specialization?: Specialization | string | null;
  style?: CSSProperties;
}) {
  return (
    <Descriptions bordered column={1} size="small" style={style}>
      <Descriptions.Item label="Career Goal">{getEntityName(careerGoal) ?? '-'}</Descriptions.Item>
      <Descriptions.Item label="Specialization">{getSpecializationDisplayName(specialization)}</Descriptions.Item>
    </Descriptions>
  );
}

function getSpecializationDisplayName(specialization?: Specialization | string | null) {
  return getEntityName(specialization) ?? 'General';
}

function getEntityName(value?: CareerGoal | Specialization | string | null): string | null {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.name;
}

function EvidenceTable({
  title,
  query,
}: {
  title: string;
  query: UseQueryResult<Paginated<Evidence>, Error>;
}) {
  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title={title} />
      <Table<Evidence>
        rowKey="id"
        dataSource={sortEvidencesPendingFirst(query.data?.data ?? [])}
        columns={[
          { title: 'Entity', dataIndex: 'relatedEntityType' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (value: EvidenceStatus) => <StatusBadge status={value} />,
          },
          { title: 'Note', dataIndex: 'note' },
          {
            title: 'Reviewer',
            render: (_value, row) => row.reviewedBy?.fullName ?? row.reviewedById ?? '-',
          },
          {
            title: 'Reviewed At',
            render: (_value, row) => formatDateTime(row.reviewedAt),
          },
          { title: 'Reviewer Note', dataIndex: 'reviewerNote' },
          { title: 'Evidence', render: (_value, row) => <EvidenceFileAction evidence={row} /> },
        ]}
      />
    </QueryState>
  );
}

function EvidenceFileAction({ evidence }: { evidence: Evidence }) {
  const { message } = App.useApp();
  const previewFile = useMutation({
    mutationFn: () => evidenceService.openPrivateFile(evidence.fileUrl ?? ''),
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const downloadFile = useMutation({
    mutationFn: () =>
      evidenceService.downloadPrivateFile(
        evidence.fileUrl ?? '',
        evidence.fileName ?? `evidence-${evidence.id}`,
      ),
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  if (evidence.fileUrl) {
    return (
      <Space>
        <Button type="link" loading={previewFile.isPending} onClick={() => previewFile.mutate()}>
          Preview
        </Button>
        <Button type="link" loading={downloadFile.isPending} onClick={() => downloadFile.mutate()}>
          Download
        </Button>
      </Space>
    );
  }

  if (evidence.evidenceUrl) {
    return (
      <Typography.Link href={evidence.evidenceUrl} target="_blank" rel="noreferrer">
        Open URL
      </Typography.Link>
    );
  }

  return '-';
}

function sortEvidencesPendingFirst(evidences: Evidence[]) {
  return evidences.slice().sort((left, right) => {
    const leftRank = getEvidenceStatusRank(left.status);
    const rightRank = getEvidenceStatusRank(right.status);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function getEvidenceStatusRank(status: EvidenceStatus) {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'REJECTED':
      return 1;
    case 'VERIFIED':
      return 2;
    default:
      return 3;
  }
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}
