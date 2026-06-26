'use client';

import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  List,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect, type CSSProperties } from 'react';
import { getPage, patchData } from '@/lib/request';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import type {
  AnalysisHistoryItem,
  AnalysisResultDetail,
  AnalysisResultSkillDetail,
  CareerGoal,
  CompetencyAnalysis,
  Evidence,
  NotificationItem,
  Paginated,
  Recommendation,
  RecommendationResource,
  ResourceProgressStatus,
  Roadmap,
  RoadmapHistoryItem,
  RoadmapItem,
  RoadmapItemStatus,
  Specialization,
  StudentRecommendationStatus,
} from '@/types/domain';
import {
  ANALYSIS_CURRENT_STATUS,
  ANALYSIS_OBSOLETE_STATUS,
  CURRENT_RECOMMENDATION_STATUSES,
  RECOMMENDATION_STATUS_TRANSITIONS,
  RESOURCE_PROGRESS_STATUS_TRANSITIONS,
  ROADMAP_CURRENT_STATUS,
  ROADMAP_ITEM_CANCELLED_STATUS,
  ROADMAP_ITEM_DONE_STATUS,
  ROADMAP_ITEM_IN_PROGRESS_STATUS,
  ROADMAP_ITEM_STATUS_TRANSITIONS,
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

export function StudentEvidencesView() {
  const query = useQuery({
    queryKey: studentQueryKeys.evidencesMe,
    queryFn: () => evidenceService.listMine(),
  });
  return <EvidenceTable title="Evidences" query={query} />;
}

export function LecturerEvidenceReviewView() {
  const { message } = App.useApp();
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
    Modal.confirm({
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
                  onClick={() =>
                    Modal.confirm({
                      title: 'Reject evidence',
                      content: 'Reject this evidence?',
                      onOk: () =>
                        reject.mutate({
                          id: row.id,
                          reviewerNote: 'Rejected by advisor',
                        }),
                    })
                  }
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
  const query = useQuery({
    queryKey: studentQueryKeys.recommendationsMe(context.scopeKey),
    queryFn: () => recommendationService.listMine(),
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
    isCurrentRecommendationStatus(item.status),
  );

  return (
    <QueryState
      loading={context.loading || (context.isContextReady && query.isLoading)}
      error={context.error ?? query.error}
    >
      <PageHeader title="Recommendations" />
      {!context.isContextReady ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="Please select a career goal before viewing recommendations."
        />
      ) : null}
      <List
        dataSource={recommendations}
        locale={{ emptyText: 'No current recommendations.' }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Select<StudentRecommendationStatus>
                key="status"
                value={item.status}
                disabled={!RECOMMENDATION_STATUS_TRANSITIONS[item.status].length}
                onChange={(status) => update.mutate({ id: item.id, status })}
                options={getRecommendationStatusOptions(item.status)}
                style={{ width: 150 }}
              />,
            ]}
          >
            <List.Item.Meta
              title={
                <Space wrap>
                  {item.title}
                  <Tag>{item.status}</Tag>
                </Space>
              }
              description={`${item.skill?.name ?? ''} · Priority ${item.priorityScore} · ${
                item.reason ?? ''
              }`}
            />
            {item.resources?.length ? (
              <RecommendationResources
                recommendation={item}
                updating={updateResourceProgress.isPending}
                onProgressChange={(resource, status) =>
                  updateResourceProgress.mutate({
                    resource,
                    recommendationId: item.id,
                    status,
                  })
                }
              />
            ) : null}
          </List.Item>
        )}
      />
    </QueryState>
  );
}

export function RoadmapView() {
  const { message } = App.useApp();
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
  const activeRoadmap =
    roadmap.data?.status === ROADMAP_CURRENT_STATUS ? roadmap.data : null;
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
      Modal.confirm({
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
      Modal.confirm({
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
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Select a career goal in your profile before generating a roadmap."
          />
        </Card>
      ) : activeRoadmap ? (
        <Card title={getRoadmapDisplayTitle(activeRoadmap)}>
          <CareerScopeSummary
            careerGoal={activeRoadmap.careerGoal}
            specialization={activeRoadmap.specialization}
          />
          <Progress percent={Number(activeRoadmap.progressPercent)} />
          <List
            dataSource={roadmapItems}
            locale={{ emptyText: 'No active roadmap items.' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Select<RoadmapItemStatus>
                    key="status"
                    value={item.status}
                    disabled={!ROADMAP_ITEM_STATUS_TRANSITIONS[item.status].length}
                    onChange={(status) => handleItemStatusChange(item, status)}
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
                      <Tag>{item.status}</Tag>
                    </Space>
                  }
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active roadmap." />
        </Card>
      )}
      {context.isContextReady ? (
        <Card title="Roadmap History" style={{ marginTop: 16 }}>
          <Table<RoadmapHistoryItem>
            rowKey="roadmapId"
            size="small"
            loading={history.isLoading}
            dataSource={history.data ?? []}
            pagination={false}
            columns={[
              { title: 'Version', dataIndex: 'version' },
              { title: 'Title', dataIndex: 'title' },
              {
                title: 'Progress',
                render: (_value, row) => `${Number(row.progressPercent)}%`,
              },
              { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
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

  useEffect(() => {
    analyze.reset();
  }, [context.careerGoalId, context.specializationId]);

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
              { title: 'Status', dataIndex: 'status', render: (value) => <AnalysisStatusTag status={value} /> },
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
          <AnalysisStatusTag status={status} />
        </Descriptions.Item>
        <Descriptions.Item label="Career Goal">{analysis.careerGoal}</Descriptions.Item>
        <Descriptions.Item label="Specialization">
          {analysis.specialization ?? 'General'}
        </Descriptions.Item>
        <Descriptions.Item label="Match">{analysis.matchPercent}%</Descriptions.Item>
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
          <AnalysisStatusTag status={analysis.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Career Goal">
          {analysis.careerGoal?.name ?? analysis.careerGoalId}
        </Descriptions.Item>
        <Descriptions.Item label="Specialization">
          {analysis.specialization?.name ?? 'General'}
        </Descriptions.Item>
        <Descriptions.Item label="Match">
          {Number(analysis.matchPercent)}%
        </Descriptions.Item>
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
                    <Tag>{item.status}</Tag>
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
        <AnalysisStatusTag status={analysis.status} />
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
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="Bạn cần hoàn thành assessment để xem phân tích năng lực."
    >
      <Button type="primary" href="/student/assessment">
        Làm assessment
      </Button>
    </Empty>
  );
}

function AnalysisStatusTag({ status }: { status: AnalysisHistoryItem['status'] }) {
  const color = status === ANALYSIS_CURRENT_STATUS ? 'green' : 'default';
  return <Tag color={color}>{status === ANALYSIS_OBSOLETE_STATUS ? 'OBSOLETE' : status}</Tag>;
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

function getRecommendationStatusOptions(status: StudentRecommendationStatus) {
  return Array.from(new Set([status, ...RECOMMENDATION_STATUS_TRANSITIONS[status]])).map(
    (value) => ({ value, label: value }),
  );
}

function isCurrentRecommendationStatus(status: StudentRecommendationStatus) {
  return CURRENT_RECOMMENDATION_STATUSES.some((currentStatus) => currentStatus === status);
}

function RecommendationResources({
  recommendation,
  updating,
  onProgressChange,
}: {
  recommendation: Recommendation;
  updating: boolean;
  onProgressChange: (
    resource: RecommendationResource,
    status: ResourceProgressStatus,
  ) => void;
}) {
  return (
    <List<RecommendationResource>
      size="small"
      dataSource={recommendation.resources ?? []}
      style={{ marginTop: 12, width: '100%' }}
      renderItem={(resource) => (
        <List.Item
          actions={[
            <Select<ResourceProgressStatus>
              key="progress"
              value={resource.progressStatus}
              loading={updating}
              disabled={!RESOURCE_PROGRESS_STATUS_TRANSITIONS[resource.progressStatus].length}
              onChange={(status) => onProgressChange(resource, status)}
              options={getResourceProgressStatusOptions(resource.progressStatus)}
              style={{ width: 150 }}
            />,
          ]}
        >
          <List.Item.Meta
            title={
              resource.resourceUrl ? (
                <Typography.Link href={resource.resourceUrl} target="_blank" rel="noreferrer">
                  {resource.resourceTitle}
                </Typography.Link>
              ) : (
                resource.resourceTitle
              )
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

function getResourceProgressStatusOptions(status: ResourceProgressStatus) {
  return Array.from(new Set([status, ...RESOURCE_PROGRESS_STATUS_TRANSITIONS[status]])).map(
    (value) => ({ value, label: value }),
  );
}

function getRoadmapItemStatusOptions(status: RoadmapItemStatus) {
  return Array.from(new Set([status, ...ROADMAP_ITEM_STATUS_TRANSITIONS[status]])).map(
    (value) => ({ value, label: value }),
  );
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
        dataSource={query.data?.data ?? []}
        columns={[
          { title: 'Entity', dataIndex: 'relatedEntityType' },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
          { title: 'Note', dataIndex: 'note' },
          { title: 'Reviewer Note', dataIndex: 'reviewerNote' },
          { title: 'Evidence', render: (_value, row) => <EvidenceFileAction evidence={row} /> },
        ]}
      />
    </QueryState>
  );
}

function EvidenceFileAction({ evidence }: { evidence: Evidence }) {
  const { message } = App.useApp();
  const openFile = useMutation({
    mutationFn: () => evidenceService.openPrivateFile(evidence.fileUrl ?? ''),
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  if (evidence.fileUrl) {
    return (
      <Button type="link" loading={openFile.isPending} onClick={() => openFile.mutate()}>
        View file
      </Button>
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

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}
