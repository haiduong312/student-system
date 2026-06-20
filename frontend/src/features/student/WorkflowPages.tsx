'use client';

import { App, Button, Card, Descriptions, List, Modal, Progress, Select, Space, Table, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { getData, getPage, patchData, postData } from '@/lib/request';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import type { CareerGoal, CompetencyAnalysis, Evidence, NotificationItem, Recommendation, Roadmap, RoadmapItem, Specialization } from '@/types/domain';

export function StudentEvidencesView() {
  const query = useQuery({ queryKey: ['evidences', 'me'], queryFn: () => getPage<Evidence>('/evidences/me', { limit: 50 }) });
  return <EvidenceTable title="Evidences" query={query} />;
}

export function LecturerEvidenceReviewView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['evidences', 'pending'], queryFn: () => getPage<Evidence>('/evidences/pending', { limit: 50 }) });
  const verify = useMutation({ mutationFn: ({ id, currentLevel }: { id: string; currentLevel?: number }) => patchData(`/evidences/${id}/verify`, currentLevel === undefined ? {} : { currentLevel }), onSuccess: () => { message.success('Verified'); queryClient.invalidateQueries({ queryKey: ['evidences'] }); } });
  const reject = useMutation({ mutationFn: ({ id, reviewerNote }: { id: string; reviewerNote: string }) => patchData(`/evidences/${id}/reject`, { reviewerNote }), onSuccess: () => { message.success('Rejected'); queryClient.invalidateQueries({ queryKey: ['evidences'] }); } });
  const handleVerify = (row: Evidence) => {
    if (row.relatedEntityType !== 'SKILL') {
      verify.mutate({ id: row.id });
      return;
    }

    let currentLevel: number | undefined;
    Modal.confirm({
      title: 'Verify skill evidence',
      content: (
        <Select
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
      <Table rowKey="id" dataSource={query.data?.data ?? []} columns={[
        { title: 'Student', render: (_value: unknown, row: Evidence) => row.student?.user?.fullName ?? row.student?.studentCode },
        { title: 'Entity', dataIndex: 'relatedEntityType' },
        { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
        { title: 'Note', dataIndex: 'note' },
        { title: 'Actions', render: (_value: unknown, row: Evidence) => <Space><Button onClick={() => handleVerify(row)}>Verify</Button><Button danger onClick={() => Modal.confirm({ title: 'Reject evidence', content: 'Reject this evidence?', onOk: () => reject.mutate({ id: row.id, reviewerNote: 'Rejected by advisor' }) })}>Reject</Button></Space> },
      ]} />
    </QueryState>
  );
}

export function RecommendationsView() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['recommendations', 'me'], queryFn: () => getPage<Recommendation>('/recommendations/me', { limit: 50 }) });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patchData(`/recommendations/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations', 'me'] }),
  });
  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Recommendations" />
      <List
        dataSource={query.data?.data ?? []}
        renderItem={(item) => (
          <List.Item actions={[<Select key="status" value={item.status} onChange={(status) => update.mutate({ id: item.id, status })} options={['NEW', 'SAVED', 'IN_PROGRESS', 'DONE', 'DISMISSED'].map((value) => ({ value }))} />]}>
            <List.Item.Meta title={item.title} description={`${item.skill?.name ?? ''} · Priority ${item.priorityScore} · ${item.reason ?? ''}`} />
          </List.Item>
        )}
      />
    </QueryState>
  );
}

export function RoadmapView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const roadmap = useQuery({ queryKey: ['roadmaps', 'me', 'active'], queryFn: () => getData<Roadmap | null>('/roadmaps/me') });
  const generate = useMutation({
    mutationFn: () => postData('/roadmaps/generate/me', {}),
    onSuccess: () => {
      message.success('Roadmap generated');
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => patchData(`/roadmaps/items/${id}/status`, { status }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roadmaps'] }); queryClient.invalidateQueries({ queryKey: ['roadmap'] }); } });
  const roadmapItems = roadmap.data ? getRoadmapItems(roadmap.data) : [];

  return (
    <QueryState loading={roadmap.isLoading} error={roadmap.error}>
      <PageHeader title="Roadmap" />
      <Space style={{ marginBottom: 16 }}><Button type="primary" onClick={() => generate.mutate()} loading={generate.isPending}>Generate Roadmap</Button></Space>
      {roadmap.data ? <Card title={getRoadmapDisplayTitle(roadmap.data)}><CareerScopeSummary careerGoal={roadmap.data.careerGoal} specialization={roadmap.data.specialization} /><Progress percent={Number(roadmap.data.progressPercent)} /><List dataSource={roadmapItems} renderItem={(item) => <List.Item actions={[<Select key="status" value={item.status} onChange={(status) => update.mutate({ id: item.id, status })} options={['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map((value) => ({ value }))} />]}><List.Item.Meta title={<Space>{`${item.orderIndex}. ${item.title}`}{item.roadmapPhase ? <Tag>{item.roadmapPhase}</Tag> : null}</Space>} description={item.description} /></List.Item>} /></Card> : <Card>No active roadmap.</Card>}
    </QueryState>
  );
}

export function NotificationsView() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications', 'me'], queryFn: () => getPage<NotificationItem>('/notifications/me', { limit: 50 }) });
  const read = useMutation({ mutationFn: (id: string) => patchData(`/notifications/${id}/read`, {}), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] }) });
  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Notifications" />
      <List dataSource={query.data?.data ?? []} renderItem={(item) => <List.Item actions={!item.isRead ? [<Button key="read" onClick={() => read.mutate(item.id)}>Mark read</Button>] : []}><List.Item.Meta title={<Space>{item.title}<Tag>{item.notificationType}</Tag>{item.isRead ? <Tag>READ</Tag> : null}</Space>} description={item.content} /></List.Item>} />
    </QueryState>
  );
}

export function AnalysisView() {
  const { message } = App.useApp();
  const analyze = useMutation({ mutationFn: () => postData<CompetencyAnalysis>('/competency/analyze/me', {}), onSuccess: () => message.success('Analysis completed') });
  return (
    <>
      <PageHeader title="Competency Analysis" />
      <Card>
        <Typography.Paragraph>Run analysis against your selected career goal.</Typography.Paragraph>
        <Button type="primary" loading={analyze.isPending} onClick={() => analyze.mutate()}>Analyze Now</Button>
        {analyze.data ? <><CareerScopeSummary careerGoal={analyze.data.careerGoal} specialization={analyze.data.specialization} style={{ marginTop: 16 }} /><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(analyze.data, null, 2)}</pre></> : null}
      </Card>
    </>
  );
}

function CareerScopeSummary({ careerGoal, specialization, style }: { careerGoal?: CareerGoal | string | null; specialization?: Specialization | string | null; style?: CSSProperties }) {
  return (
    <Descriptions bordered column={1} size="small" style={style}>
      <Descriptions.Item label="Career Goal">{getEntityName(careerGoal) ?? '-'}</Descriptions.Item>
      <Descriptions.Item label="Specialization">{getSpecializationDisplayName(specialization)}</Descriptions.Item>
    </Descriptions>
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

function EvidenceTable({ title, query }: { title: string; query: any }) {
  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title={title} />
      <Table rowKey="id" dataSource={query.data?.data ?? []} columns={[
        { title: 'Entity', dataIndex: 'relatedEntityType' },
        { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
        { title: 'Note', dataIndex: 'note' },
        { title: 'Reviewer Note', dataIndex: 'reviewerNote' },
      ]} />
    </QueryState>
  );
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data
  ) {
    const message = error.response.data.message;
    return Array.isArray(message) ? message.join(', ') : String(message);
  }

  return 'Something went wrong.';
}
