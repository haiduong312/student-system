'use client';

import {
  CheckOutlined,
  ClockCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  App,
  Empty,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  canUpdateResourceProgressStatus,
  canUpdateRoadmapItemStatus,
  getResourceProgressStatusOptions,
  getRoadmapItemStatusOptions,
} from '@/lib/status';
import type {
  ResourceProgressStatus,
  Roadmap,
  RoadmapHistoryItem,
  RoadmapItem,
  RoadmapItemResource,
  RoadmapItemStatus,
  RoadmapPhase,
  RoadmapPhaseGroup,
} from '@/types/domain';
import styles from './SelectedRoadmap.module.css';

const PHASE_ORDER: RoadmapPhase[] = [
  'CORE_FOUNDATION',
  'CAREER_TRACK',
  'SPECIALIZATION',
  'PRACTICE_PROJECT',
  'PORTFOLIO_PREPARATION',
];

const PHASE_META: Record<RoadmapPhase, { label: string; description: string }> = {
  CORE_FOUNDATION: {
    label: 'Core Foundation',
    description: 'Build the essential knowledge and skills first.',
  },
  CAREER_TRACK: {
    label: 'Career Track',
    description: 'Develop the capabilities required by your target role.',
  },
  SPECIALIZATION: {
    label: 'Specialization',
    description: 'Deepen the skills that differentiate your chosen direction.',
  },
  PRACTICE_PROJECT: {
    label: 'Practice Project',
    description: 'Apply knowledge through practical work and evidence.',
  },
  PORTFOLIO_PREPARATION: {
    label: 'Portfolio Preparation',
    description: 'Package completed work into a credible portfolio.',
  },
};

interface SelectedRoadmapProps {
  roadmap: Roadmap | null;
  history: RoadmapHistoryItem[];
  updatingStatus: boolean;
  updatingResource: boolean;
  onStatusChange: (
    item: RoadmapItem,
    status: RoadmapItemStatus,
    note?: string,
  ) => Promise<void>;
  onResourceProgressChange: (
    resource: RoadmapItemResource,
    recommendationId: string | null | undefined,
    status: ResourceProgressStatus,
  ) => Promise<void>;
}

export function SelectedRoadmap({
  roadmap,
  history,
  updatingStatus,
  updatingResource,
  onStatusChange,
  onResourceProgressChange,
}: SelectedRoadmapProps) {
  return (
    <section aria-label="Development roadmap">
      {roadmap ? (
        <ActiveRoadmap
          roadmap={roadmap}
          updatingStatus={updatingStatus}
          updatingResource={updatingResource}
          onStatusChange={onStatusChange}
          onResourceProgressChange={onResourceProgressChange}
        />
      ) : (
        <div className={styles.emptyState}>
          <Empty description="No active roadmap. Generate one from your latest competency analysis." />
        </div>
      )}

      <RoadmapHistory history={history} />
    </section>
  );
}

function ActiveRoadmap({
  roadmap,
  updatingStatus,
  updatingResource,
  onStatusChange,
  onResourceProgressChange,
}: Omit<SelectedRoadmapProps, 'history'> & { roadmap: Roadmap }) {
  const groups = getRoadmapPhases(roadmap);
  const items = groups.flatMap((group) => group.items);
  const completed = items.filter((item) => item.status === 'DONE').length;
  const inProgress = items.filter((item) => item.status === 'IN_PROGRESS').length;
  const progressPercent = Number(roadmap.progressPercent);

  return (
    <>
      <div className={styles.summary}>
        <div>
          <Typography.Text type="secondary">
            Version {roadmap.version ?? 1} · {roadmap.status}
          </Typography.Text>
          <Typography.Title level={3} className={styles.summaryTitle}>
            {roadmap.title}
          </Typography.Title>
          <Typography.Text type="secondary">
            {completed} of {items.length} completed
          </Typography.Text>
        </div>
        <div className={styles.summaryStats}>
          <span>
            <ClockCircleOutlined /> {inProgress} in progress
          </span>
          <span>
            <CheckOutlined /> {completed} done
          </span>
        </div>
        <Progress
          percent={Number.isFinite(progressPercent) ? progressPercent : 0}
          strokeColor="#1677ff"
          className={styles.progress}
        />
      </div>

      <div className={styles.timeline}>
        {groups.map((group, phaseIndex) => (
          <section className={styles.phase} key={group.phase}>
            <div className={styles.phaseMarker}>
              <span>{phaseIndex + 1}</span>
            </div>
            <div className={styles.phaseContent}>
              <div className={styles.phaseHeader}>
                <div>
                  <Typography.Title level={4} className={styles.phaseTitle}>
                    {PHASE_META[group.phase].label}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {PHASE_META[group.phase].description}
                  </Typography.Text>
                </div>
                <Tag color="blue">{group.items.length} items</Tag>
              </div>

              <div className={styles.itemGrid}>
                {group.items.map((item) => (
                  <RoadmapItemCard
                    key={item.id}
                    item={item}
                    phase={group.phase}
                    updatingStatus={updatingStatus}
                    updatingResource={updatingResource}
                    onStatusChange={onStatusChange}
                    onResourceProgressChange={onResourceProgressChange}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function RoadmapItemCard({
  item,
  phase,
  updatingStatus,
  updatingResource,
  onStatusChange,
  onResourceProgressChange,
}: {
  item: RoadmapItem;
  phase: RoadmapPhase;
  updatingStatus: boolean;
  updatingResource: boolean;
  onStatusChange: SelectedRoadmapProps['onStatusChange'];
  onResourceProgressChange: SelectedRoadmapProps['onResourceProgressChange'];
}) {
  const { message, modal } = App.useApp();
  const statusOptions = getRoadmapItemStatusOptions(item.status);

  const handleStatusChange = (status: RoadmapItemStatus) => {
    if (
      status === item.status ||
      !canUpdateRoadmapItemStatus(item.status, status)
    ) {
      return;
    }

    if (item.status === 'DONE' && status === 'IN_PROGRESS') {
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
            message.error('A reason is required.');
            return Promise.reject(new Error('A reason is required.'));
          }

          return onStatusChange(item, status, note.trim());
        },
      });
      return;
    }

    void onStatusChange(item, status).catch(() => undefined);
  };

  return (
    <article
      className={`${styles.itemCard} ${item.status === 'DONE' ? styles.doneItem : ''}`}
      data-testid="roadmap-item"
    >
      <div className={styles.itemHeader}>
        <div className={styles.itemTitleBlock}>
          <Space size={8} wrap>
            <Typography.Title level={5} className={styles.itemTitle}>
              {item.orderIndex}. {item.title}
            </Typography.Title>
            <StatusBadge status={item.status} />
            <Tag>{item.roadmapPhase ?? phase}</Tag>
          </Space>
          <Typography.Text type="secondary">
            {item.skillName ?? item.skill?.name ?? 'General development'} · Weight{' '}
            {Number(item.weight)}
          </Typography.Text>
        </div>
        <Select<RoadmapItemStatus>
          aria-label={`Roadmap item status for ${item.title}`}
          value={item.status}
          loading={updatingStatus}
          disabled={updatingStatus || statusOptions.length <= 1}
          onChange={handleStatusChange}
          options={statusOptions}
          className={styles.statusSelect}
        />
      </div>

      {item.description ? (
        <Typography.Paragraph className={styles.itemDescription}>
          {item.description}
        </Typography.Paragraph>
      ) : null}

      {item.resources?.length ? (
        <div className={styles.resourceSection}>
          <Typography.Text strong>Learning resources</Typography.Text>
          <div className={styles.resourceList}>
            {item.resources.map((resource) => (
              <div className={styles.resourceItem} key={resource.id}>
                <div className={styles.resourceIdentity}>
                  <LinkOutlined />
                  <div>
                    {resource.url ? (
                      <Typography.Link
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {resource.title}
                      </Typography.Link>
                    ) : (
                      <Typography.Text>{resource.title}</Typography.Text>
                    )}
                    <Typography.Text type="secondary" className={styles.resourceMeta}>
                      {resource.resourceType} · {resource.provider ?? 'Self-study'}
                    </Typography.Text>
                  </div>
                </div>
                <Select<ResourceProgressStatus>
                  aria-label={`Resource progress for ${resource.title}`}
                  size="small"
                  value={resource.progressStatus}
                  loading={updatingResource}
                  disabled={
                    updatingResource ||
                    getResourceProgressStatusOptions(resource.progressStatus).length <= 1
                  }
                  onChange={(status) => {
                    if (
                      status === resource.progressStatus ||
                      !canUpdateResourceProgressStatus(resource.progressStatus, status)
                    ) {
                      return;
                    }

                    void onResourceProgressChange(
                      resource,
                      item.recommendationId,
                      status,
                    ).catch(() => undefined);
                  }}
                  options={getResourceProgressStatusOptions(resource.progressStatus)}
                  className={styles.resourceSelect}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function RoadmapHistory({ history }: { history: RoadmapHistoryItem[] }) {
  return (
    <section className={styles.history} aria-labelledby="roadmap-history-title">
      <Typography.Title
        id="roadmap-history-title"
        level={4}
        className={styles.historyTitle}
      >
        Roadmap history
      </Typography.Title>
      <Table<RoadmapHistoryItem>
        rowKey="roadmapId"
        dataSource={history}
        pagination={false}
        locale={{ emptyText: 'No roadmap versions yet.' }}
        scroll={{ x: 640 }}
        columns={[
          {
            title: 'Version',
            dataIndex: 'version',
            width: 90,
            render: (version: number) => `v${version}`,
          },
          { title: 'Title', dataIndex: 'title' },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 130,
            render: (status: RoadmapHistoryItem['status']) => (
              <StatusBadge status={status} />
            ),
          },
          {
            title: 'Progress',
            dataIndex: 'progressPercent',
            width: 110,
            render: (progress: number) => `${Number(progress)}%`,
          },
          {
            title: 'Updated',
            dataIndex: 'updatedAt',
            width: 180,
            render: (updatedAt: string) => new Date(updatedAt).toLocaleString(),
          },
        ]}
      />
    </section>
  );
}

function getRoadmapPhases(roadmap: Roadmap): RoadmapPhaseGroup[] {
  const phases = roadmap.phases?.length
    ? roadmap.phases
    : PHASE_ORDER.map((phase) => ({
        phase,
        items: (roadmap.items ?? []).filter(
          (item) => (item.roadmapPhase ?? 'CAREER_TRACK') === phase,
        ),
      }));

  return [...phases]
    .filter((group) => group.items.length > 0)
    .sort(
      (a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase),
    )
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.orderIndex - b.orderIndex),
    }));
}
