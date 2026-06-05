'use client';

import { Button, Card, List, Modal, Progress, Select, Space, Table, Tag, Typography, App } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getData, getPage, patchData, postData } from '@/lib/request';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryState } from '@/components/ui/QueryState';
import type { Evidence, NotificationItem, Recommendation, Roadmap } from '@/types/domain';

export function StudentEvidencesView() {
  const query = useQuery({ queryKey: ['evidences', 'me'], queryFn: () => getPage<Evidence>('/evidences/me', { limit: 50 }) });
  return <EvidenceTable title="Evidences" query={query} />;
}

export function LecturerEvidenceReviewView() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['evidences', 'pending'], queryFn: () => getPage<Evidence>('/evidences/pending', { limit: 50 }) });
  const verify = useMutation({ mutationFn: (id: string) => patchData(`/evidences/${id}/verify`, {}), onSuccess: () => { message.success('Verified'); queryClient.invalidateQueries({ queryKey: ['evidences'] }); } });
  const reject = useMutation({ mutationFn: ({ id, reviewerNote }: { id: string; reviewerNote: string }) => patchData(`/evidences/${id}/reject`, { reviewerNote }), onSuccess: () => { message.success('Rejected'); queryClient.invalidateQueries({ queryKey: ['evidences'] }); } });

  return (
    <QueryState loading={query.isLoading} error={query.error}>
      <PageHeader title="Pending Evidences" />
      <Table rowKey="id" dataSource={query.data?.data ?? []} columns={[
        { title: 'Student', render: (_value: unknown, row: Evidence) => row.student?.user?.fullName ?? row.student?.studentCode },
        { title: 'Entity', dataIndex: 'relatedEntityType' },
        { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
        { title: 'Note', dataIndex: 'note' },
        { title: 'Actions', render: (_value: unknown, row: Evidence) => <Space><Button onClick={() => verify.mutate(row.id)}>Verify</Button><Button danger onClick={() => Modal.confirm({ title: 'Reject evidence', content: 'Reject this evidence?', onOk: () => reject.mutate({ id: row.id, reviewerNote: 'Rejected by advisor' }) })}>Reject</Button></Space> },
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
  const list = useQuery({ queryKey: ['roadmaps', 'me'], queryFn: () => getPage<Roadmap>('/roadmaps/me', { limit: 10, status: 'ACTIVE' }) });
  const active = list.data?.data?.[0];
  const detail = useQuery({ queryKey: ['roadmap', active?.id], queryFn: () => getData<Roadmap>(`/roadmaps/${active?.id}`), enabled: Boolean(active?.id) });
  const generate = useMutation({ mutationFn: () => postData('/roadmaps/generate/me', {}), onSuccess: () => { message.success('Roadmap generated'); queryClient.invalidateQueries({ queryKey: ['roadmaps'] }); } });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => patchData(`/roadmaps/items/${id}/status`, { status }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roadmaps'] }); queryClient.invalidateQueries({ queryKey: ['roadmap'] }); } });

  return (
    <QueryState loading={list.isLoading || detail.isLoading} error={list.error || detail.error}>
      <PageHeader title="Roadmap" />
      <Space style={{ marginBottom: 16 }}><Button type="primary" onClick={() => generate.mutate()} loading={generate.isPending}>Generate Roadmap</Button></Space>
      {detail.data ? <Card title={detail.data.title}><Progress percent={Number(detail.data.progressPercent)} /><List dataSource={detail.data.items ?? []} renderItem={(item) => <List.Item actions={[<Select key="status" value={item.status} onChange={(status) => update.mutate({ id: item.id, status })} options={['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map((value) => ({ value }))} />]}><List.Item.Meta title={`${item.orderIndex}. ${item.title}`} description={item.description} /></List.Item>} /></Card> : <Card>No active roadmap.</Card>}
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
  const analyze = useMutation({ mutationFn: () => postData<any>('/competency/analyze/me', {}), onSuccess: () => message.success('Analysis completed') });
  return (
    <>
      <PageHeader title="Competency Analysis" />
      <Card>
        <Typography.Paragraph>Run analysis against your selected career goal.</Typography.Paragraph>
        <Button type="primary" loading={analyze.isPending} onClick={() => analyze.mutate()}>Analyze Now</Button>
        {analyze.data ? <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(analyze.data, null, 2)}</pre> : null}
      </Card>
    </>
  );
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
