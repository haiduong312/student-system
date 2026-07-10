'use client';

import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Input,
  List,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
} from 'antd';
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
import {
  canUpdateRecommendationStatus,
  canUpdateResourceProgressStatus,
  canUpdateRoadmapItemStatus,
  getRecommendationStatusOptions,
  getResourceProgressStatusOptions,
  getRoadmapItemStatusOptions,
  isActionableRecommendation,
  isActiveRoadmap,
} from '@/lib/status';
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
  Roadmap,
  RoadmapHistoryItem,
  RoadmapItem,
  RoadmapItemResource,
  RoadmapItemStatus,
  Specialization,
  StudentRecommendationStatus,
} from '@/types/domain';
import {
  ANALYSIS_CURRENT_STATUS,
  ROADMAP_ITEM_CANCELLED_STATUS,
  ROADMAP_ITEM_DONE_STATUS,
  ROADMAP_ITEM_IN_PROGRESS_STATUS,
} from '@/types/domain';
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
import { roadmapService } from './roadmap.service';

type AnalysisSkill = CompetencyAnalysis['skills'][number];
type RecommendationFilter = 'active' | 'done' | 'dismissed';

interface LearningResourceProgressItem {
  key: string;
  resourceId: string;
  title: string;
  description?: string | null;
  resourceType: RecommendationResource['resourceType'];
  url?: string | null;
  provider?: string | null;
  estimatedDuration?: string | null;
  progressStatus: ResourceProgressStatus;
  recommendationId?: string | null;
}

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
      <RecommendationList
        recommendations={recommendations}
        filter={filter}
        updatingStatus={update.isPending}
        updatingResource={updateResourceProgress.isPending}
        onStatusChange={(id, status) => update.mutate({ id, status })}
        onProgressChange={(resource, recommendationId, status) =>
          updateResourceProgress.mutate({
            resource,
            recommendationId,
            status,
          })
        }
      />
    </QueryState>
  );
}

export function RoadmapView() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const context = useCurrentProfileContext();
  const roadmap = useQuery({
    queryKey: studentQueryKeys.roadmapsActive(context.scopeKey),
    queryFn: () => roadmapService.getMyActiveRoadmap(),
    enabled: context.isContextReady,
  });
  const history = useQuery({
    queryKey: studentQueryKeys.roadmapsHistory,
    queryFn: () => roadmapService.listMyHistory(),
    enabled: context.isContextReady,
  });
  const activeRoadmap = isActiveRoadmap(roadmap.data?.status) ? roadmap.data : null;
  const generate = useMutation({
    mutationFn: () => roadmapService.generateMine({ archiveCurrentActiveRoadmap: true }),
    onSuccess: () => {
      message.success('Roadmap generated');
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const update = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: RoadmapItemStatus;
      note?: string;
    }) =>
      roadmapService.updateItemStatus(id, note ? { status, note } : { status }),
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
      resource: RoadmapItemResource;
      recommendationId?: string | null;
      status: ResourceProgressStatus;
    }) =>
      learningResourceService.updateProgress(resource.id, {
        status,
        ...(recommendationId ? { recommendationId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentQueryKeys.learningResourceProgress(context.scopeKey),
      });
      invalidateStudentCurrentContextQueries(queryClient);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });
  const roadmapItems = activeRoadmap
    ? getRoadmapItems(activeRoadmap).filter(
        (item) => item.status !== ROADMAP_ITEM_CANCELLED_STATUS,
      )
    : [];

  const handleGenerate = () => {
    if (!context.isContextReady) {
      message.error('Please select a career goal before generating roadmap.');
      return;
    }

    if (activeRoadmap) {
      modal.confirm({
        title: 'Generate a new roadmap?',
        content: 'The current active roadmap will be archived.',
        okText: 'Generate',
        onOk: () => generate.mutate(),
      });
      return;
    }

    generate.mutate();
  };

  const handleItemStatusChange = (item: RoadmapItem, status: RoadmapItemStatus) => {
    if (status === item.status) {
      return;
    }

    if (
      item.status === ROADMAP_ITEM_DONE_STATUS &&
      status === ROADMAP_ITEM_IN_PROGRESS_STATUS
    ) {
      let note = '';
      modal.confirm({
        title: 'Move item back to in progress?',
        content: (
          <Input.TextArea
            rows={3}
            maxLength={1000}
            placeholder="Reason"
            onChange={(event) => {
              note = event.target.value;
            }}
          />
        ),
        okText: 'Update',
        onOk: () => {
          if (!note.trim()) {
            message.error('A note is required.');
            return Promise.reject();
          }

          update.mutate({ id: item.id, status, note: note.trim() });
          return undefined;
        },
      });
      return;
    }

    update.mutate({ id: item.id, status });
  };

  return (
    <QueryState
      loading={context.loading || (context.isContextReady && roadmap.isLoading)}
      error={context.error ?? roadmap.error}
    >
      <PageHeader title="Roadmap" />
      <Space style={{ marginBottom: 16 }}>
        <Button
          aria-label="Generate roadmap from toolbar"
          type="primary"
          onClick={handleGenerate}
          loading={generate.isPending}
          disabled={!context.isContextReady}
        >
          Generate Roadmap
        </Button>
      </Space>
      {!context.isContextReady ? (
        <Card>
          <EmptyState description="Select a career goal in your profile before generating a roadmap." />
        </Card>
      ) : activeRoadmap ? (
        <Card title={getRoadmapDisplayTitle(activeRoadmap)}>
          <CareerScopeSummary
            careerGoal={activeRoadmap.careerGoal}
            specialization={activeRoadmap.specialization}
          />
          <Space style={{ marginTop: 16, marginBottom: 8 }}>
            <StatusBadge status={activeRoadmap.status} />
            <Typography.Text type="secondary">
              Generated from actionable recommendations only.
            </Typography.Text>
          </Space>
          <Progress percent={Number(activeRoadmap.progressPercent)} />
          <RoadmapTimeline
            items={roadmapItems}
            updatingItem={update.isPending}
            updatingResource={updateResourceProgress.isPending}
            onItemStatusChange={handleItemStatusChange}
            onResourceProgressChange={(resource, recommendationId, status) =>
              updateResourceProgress.mutate({
                resource,
                recommendationId,
                status,
              })
            }
          />
        </Card>
      ) : (
        <Card>
          <EmptyState description="No active roadmap.">
            <Button
              aria-label="Generate roadmap from empty state"
              type="primary"
              loading={generate.isPending}
              onClick={handleGenerate}
            >
              Generate Roadmap
            </Button>
          </EmptyState>
        </Card>
      )}
      {context.isContextReady ? (
        <Card title="Roadmap History" style={{ marginTop: 16 }}>
          <Table<RoadmapHistoryItem>
            rowKey="roadmapId"
            size="small"
            loading={history.isLoading}
            dataSource={(history.data ?? []).filter(
              (item) => !isActiveRoadmap(item.status),
            )}
            pagination={false}
            columns={[
              { title: 'Version', dataIndex: 'version' },
              { title: 'Title', dataIndex: 'title' },
              {
                title: 'Progress',
                render: (_value, row) => `${Number(row.progressPercent)}%`,
              },
              { title: 'Status', dataIndex: 'status', render: (value) => <StatusBadge status={value} /> },
            ]}
          />
        </Card>
      ) : null}
    </QueryState>
  );
}

export function NotificationsView() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: studentQueryKeys.notificationsMe,
    queryFn: () => getPage<NotificationItem>('/notifications/me', { limit: 50 }),
  });
  const read = useMutation({
    mutationFn: (id: string) => patchData(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentQueryKeys.notificationsMe }),
  });
  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Notifications" />
      <List
        dataSource={query.data?.data ?? []}
        renderItem={(item) => (
          <List.Item
            actions={
              !item.isRead
                ? [<Button key="read" onClick={() => read.mutate(item.id)}>Mark read</Button>]
                : []
            }
          >
            <List.Item.Meta
              title={
                <Space>
                  {item.title}
                  <Tag>{item.notificationType}</Tag>
                  {item.isRead ? <Tag>READ</Tag> : null}
                </Space>
              }
              description={item.content}
            />
          </List.Item>
        )}
      />
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

function RecommendationList({
  recommendations,
  filter,
  updatingStatus,
  updatingResource,
  onStatusChange,
  onProgressChange,
}: {
  recommendations: Recommendation[];
  filter: RecommendationFilter;
  updatingStatus: boolean;
  updatingResource: boolean;
  onStatusChange: (id: string, status: StudentRecommendationStatus) => void;
  onProgressChange: (
    resource: RecommendationResource,
    recommendationId: string,
    status: ResourceProgressStatus,
  ) => void;
}) {
  if (!recommendations.length) {
    return (
      <EmptyState
        description={
          filter === 'active'
            ? 'Chưa có gợi ý học tập. Hãy hoàn thành phân tích năng lực trước.'
            : `No ${RECOMMENDATION_FILTER_LABEL[filter].toLowerCase()} recommendations.`
        }
      >
        {filter === 'active' ? (
          <Button type="primary" href="/student/analysis">
            Analyze Now
          </Button>
        ) : null}
      </EmptyState>
    );
  }

  return (
    <List<Recommendation>
      dataSource={recommendations}
      renderItem={(item) => (
        <List.Item
          data-testid="recommendation-card"
          actions={[
            <Select<StudentRecommendationStatus>
              aria-label={`Recommendation status for ${item.title}`}
              key="status"
              value={item.status}
              loading={updatingStatus}
              disabled={updatingStatus || getRecommendationStatusOptions(item.status).length <= 1}
              onChange={(status) => {
                if (
                  status === item.status ||
                  !canUpdateRecommendationStatus(item.status, status)
                ) {
                  return;
                }

                onStatusChange(item.id, status);
              }}
              options={getRecommendationStatusOptions(item.status)}
              style={{ width: 150 }}
            />,
          ]}
        >
          <List.Item.Meta
            title={
              <Space wrap>
                {item.title}
                <StatusBadge status={item.status} />
                {isActionableRecommendation(item.status) ? (
                  <Tag color="blue">ROADMAP ACTIONABLE</Tag>
                ) : null}
              </Space>
            }
            description={`${item.skill?.name ?? ''} · Priority ${item.priorityScore} · ${
              item.reason ?? ''
            }`}
          />
          {item.resources?.length ? (
            <LearningResourceList
              resources={item.resources.map((resource) =>
                toRecommendationResourceProgressItem(resource, item.id),
              )}
              updating={updatingResource}
              onProgressChange={(resource, status) =>
                onProgressChange(
                  resourceToRecommendationResource(resource, item.resources ?? []),
                  item.id,
                  status,
                )
              }
            />
          ) : null}
        </List.Item>
      )}
    />
  );
}

function RoadmapTimeline({
  items,
  updatingItem,
  updatingResource,
  onItemStatusChange,
  onResourceProgressChange,
}: {
  items: RoadmapItem[];
  updatingItem: boolean;
  updatingResource: boolean;
  onItemStatusChange: (item: RoadmapItem, status: RoadmapItemStatus) => void;
  onResourceProgressChange: (
    resource: RoadmapItemResource,
    recommendationId: string | null | undefined,
    status: ResourceProgressStatus,
  ) => void;
}) {
  return (
    <List<RoadmapItem>
      dataSource={items}
      locale={{ emptyText: 'No active roadmap items.' }}
      style={{ marginTop: 16 }}
      renderItem={(item) => (
        <List.Item
          data-testid="roadmap-item"
          actions={[
            <Select<RoadmapItemStatus>
              aria-label={`Roadmap item status for ${item.title}`}
              key="status"
              value={item.status}
              loading={updatingItem}
              disabled={updatingItem || getRoadmapItemStatusOptions(item.status).length <= 1}
              onChange={(status) => {
                if (
                  status === item.status ||
                  !canUpdateRoadmapItemStatus(item.status, status)
                ) {
                  return;
                }

                onItemStatusChange(item, status);
              }}
              options={getRoadmapItemStatusOptions(item.status)}
              style={{ width: 150 }}
            />,
          ]}
        >
          <List.Item.Meta
            title={
              <Space wrap>
                {`${item.orderIndex}. ${item.title}`}
                {item.roadmapPhase ? <Tag>{item.roadmapPhase}</Tag> : null}
                <StatusBadge status={item.status} />
              </Space>
            }
            description={item.description}
          />
          {item.resources?.length ? (
            <LearningResourceList
              resources={item.resources.map((resource) =>
                toRoadmapResourceProgressItem(resource, item.recommendationId),
              )}
              updating={updatingResource}
              onProgressChange={(resource, status) =>
                onResourceProgressChange(
                  resourceToRoadmapResource(resource, item.resources ?? []),
                  item.recommendationId,
                  status,
                )
              }
            />
          ) : null}
        </List.Item>
      )}
    />
  );
}

function LearningResourceList({
  resources,
  updating,
  onProgressChange,
}: {
  resources: LearningResourceProgressItem[];
  updating: boolean;
  onProgressChange: (
    resource: LearningResourceProgressItem,
    status: ResourceProgressStatus,
  ) => void;
}) {
  return (
    <List<LearningResourceProgressItem>
      size="small"
      dataSource={resources}
      style={{ marginTop: 12, width: '100%' }}
      renderItem={(resource) => (
        <List.Item
          actions={[
            <Select<ResourceProgressStatus>
              aria-label={`Resource progress for ${resource.title}`}
              key="progress"
              value={resource.progressStatus}
              loading={updating}
              disabled={
                updating ||
                getResourceProgressStatusOptions(resource.progressStatus).length <= 1
              }
              onChange={(status) => {
                if (
                  status === resource.progressStatus ||
                  !canUpdateResourceProgressStatus(resource.progressStatus, status)
                ) {
                  return;
                }

                onProgressChange(resource, status);
              }}
              options={getResourceProgressStatusOptions(resource.progressStatus)}
              style={{ width: 150 }}
            />,
          ]}
        >
          <List.Item.Meta
            title={
              <Space wrap>
                {resource.url ? (
                  <Typography.Link href={resource.url} target="_blank" rel="noreferrer">
                    {resource.title}
                  </Typography.Link>
                ) : (
                  resource.title
                )}
                <StatusBadge status={resource.progressStatus} />
              </Space>
            }
            description={`${resource.resourceType} · ${resource.provider ?? '-'} · ${
              resource.estimatedDuration ?? '-'
            }`}
          />
        </List.Item>
      )}
    />
  );
}

function toRecommendationResourceProgressItem(
  resource: RecommendationResource,
  recommendationId: string,
): LearningResourceProgressItem {
  return {
    key: resource.id,
    resourceId: resource.resourceId,
    title: resource.resourceTitle,
    description: resource.resourceDescription,
    resourceType: resource.resourceType,
    url: resource.resourceUrl,
    provider: resource.provider,
    estimatedDuration: resource.estimatedDuration,
    progressStatus: resource.progressStatus,
    recommendationId,
  };
}

function toRoadmapResourceProgressItem(
  resource: RoadmapItemResource,
  recommendationId?: string | null,
): LearningResourceProgressItem {
  return {
    key: resource.id,
    resourceId: resource.id,
    title: resource.title,
    resourceType: resource.resourceType,
    url: resource.url,
    provider: resource.provider,
    estimatedDuration: resource.estimatedDuration,
    progressStatus: resource.progressStatus,
    recommendationId,
  };
}

function resourceToRecommendationResource(
  resource: LearningResourceProgressItem,
  resources: RecommendationResource[],
) {
  const original = resources.find((item) => item.resourceId === resource.resourceId);
  if (!original) {
    throw new Error('Learning resource is no longer attached to this recommendation.');
  }

  return original;
}

function resourceToRoadmapResource(
  resource: LearningResourceProgressItem,
  resources: RoadmapItemResource[],
) {
  const original = resources.find((item) => item.id === resource.resourceId);
  if (!original) {
    throw new Error('Learning resource is no longer attached to this roadmap item.');
  }

  return original;
}

function getRoadmapDisplayTitle(roadmap: Roadmap) {
  const specializationName = getEntityName(roadmap.specialization);
  const careerGoalName = getEntityName(roadmap.careerGoal);
  const scopeName = specializationName ?? careerGoalName;

  return scopeName ? `${scopeName} Roadmap` : roadmap.title;
}

function getRoadmapItems(roadmap: Roadmap): RoadmapItem[] {
  if (roadmap.phases?.length) {
    return roadmap.phases.flatMap((phase) =>
      phase.items.map((item) => ({ ...item, roadmapPhase: item.roadmapPhase ?? phase.phase })),
    );
  }

  return roadmap.items ?? [];
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
    case 'VERIFIED_WITH_PENDING_CHANGES':
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
