'use client';

import {
  CheckOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  PauseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  canUpdateResourceProgressStatus,
  getResourceProgressStatusOptions,
} from '@/lib/status';
import type {
  Recommendation,
  RecommendationResource,
  ResourceProgressStatus,
  RoadmapPhase,
  StudentRecommendationStatus,
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
  recommendations: Recommendation[];
  updatingStatus: boolean;
  updatingResource: boolean;
  onStatusChange: (
    recommendation: Recommendation,
    status: StudentRecommendationStatus,
  ) => void;
  onResourceProgressChange: (
    resource: RecommendationResource,
    recommendationId: string,
    status: ResourceProgressStatus,
  ) => void;
}

export function SelectedRoadmap({
  recommendations,
  updatingStatus,
  updatingResource,
  onStatusChange,
  onResourceProgressChange,
}: SelectedRoadmapProps) {
  if (!recommendations.length) {
    return (
      <div className={styles.emptyState}>
        <Empty description="Your roadmap is empty. Add recommendations you want to follow first.">
          <Button type="primary" href="/student/recommendations">
            Explore Recommendations
          </Button>
        </Empty>
      </div>
    );
  }

  const groups = groupByPhase(recommendations);
  const completed = recommendations.filter((item) => item.status === 'DONE').length;
  const inProgress = recommendations.filter((item) => item.status === 'IN_PROGRESS').length;
  const progressPercent = Math.round((completed / recommendations.length) * 100);

  return (
    <section aria-label="Selected recommendation roadmap">
      <div className={styles.summary}>
        <div>
          <Typography.Text type="secondary">Overall progress</Typography.Text>
          <Typography.Title level={3} className={styles.summaryTitle}>
            {completed} of {recommendations.length} completed
          </Typography.Title>
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
          percent={progressPercent}
          strokeColor={{ from: '#1677ff', to: '#52c41a' }}
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
                {group.items.map((recommendation, itemIndex) => (
                  <RoadmapRecommendationCard
                    key={recommendation.id}
                    order={itemIndex + 1}
                    recommendation={recommendation}
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
    </section>
  );
}

function RoadmapRecommendationCard({
  order,
  recommendation,
  updatingStatus,
  updatingResource,
  onStatusChange,
  onResourceProgressChange,
}: {
  order: number;
  recommendation: Recommendation;
  updatingStatus: boolean;
  updatingResource: boolean;
  onStatusChange: (
    recommendation: Recommendation,
    status: StudentRecommendationStatus,
  ) => void;
  onResourceProgressChange: (
    resource: RecommendationResource,
    recommendationId: string,
    status: ResourceProgressStatus,
  ) => void;
}) {
  return (
    <article
      className={`${styles.itemCard} ${
        recommendation.status === 'DONE' ? styles.doneItem : ''
      }`}
      data-testid="roadmap-recommendation-item"
    >
      <div className={styles.itemHeader}>
        <span className={styles.itemOrder}>{order}</span>
        <div className={styles.itemTitleBlock}>
          <Space size={8} wrap>
            <Typography.Title level={5} className={styles.itemTitle}>
              {recommendation.title}
            </Typography.Title>
            <StatusBadge status={recommendation.status} />
          </Space>
          <Typography.Text type="secondary">
            {recommendation.skill?.name ?? 'General development'} · Priority{' '}
            {Number(recommendation.priorityScore).toFixed(0)}
          </Typography.Text>
        </div>
        <RoadmapActions
          recommendation={recommendation}
          updating={updatingStatus}
          onStatusChange={onStatusChange}
        />
      </div>

      {recommendation.description ? (
        <Typography.Paragraph className={styles.itemDescription}>
          {recommendation.description}
        </Typography.Paragraph>
      ) : null}

      {recommendation.resources?.length ? (
        <div className={styles.resourceSection}>
          <Typography.Text strong>Learning resources</Typography.Text>
          <div className={styles.resourceList}>
            {recommendation.resources.map((resource) => (
              <div className={styles.resourceItem} key={resource.id}>
                <div className={styles.resourceIdentity}>
                  <LinkOutlined />
                  <div>
                    {resource.resourceUrl ? (
                      <Typography.Link
                        href={resource.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {resource.resourceTitle}
                      </Typography.Link>
                    ) : (
                      <Typography.Text>{resource.resourceTitle}</Typography.Text>
                    )}
                    <Typography.Text type="secondary" className={styles.resourceMeta}>
                      {resource.resourceType} · {resource.provider ?? 'Self-study'}
                    </Typography.Text>
                  </div>
                </div>
                <Select<ResourceProgressStatus>
                  aria-label={`Resource progress for ${resource.resourceTitle}`}
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

                    onResourceProgressChange(resource, recommendation.id, status);
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

function RoadmapActions({
  recommendation,
  updating,
  onStatusChange,
}: {
  recommendation: Recommendation;
  updating: boolean;
  onStatusChange: (
    recommendation: Recommendation,
    status: StudentRecommendationStatus,
  ) => void;
}) {
  if (recommendation.status === 'SAVED') {
    return (
      <Button
        type="primary"
        icon={<PlayCircleOutlined />}
        loading={updating}
        disabled={updating}
        onClick={() => onStatusChange(recommendation, 'IN_PROGRESS')}
      >
        Start
      </Button>
    );
  }

  if (recommendation.status === 'IN_PROGRESS') {
    return (
      <Space wrap>
        <Button
          icon={<PauseOutlined />}
          disabled={updating}
          onClick={() => onStatusChange(recommendation, 'SAVED')}
        >
          Pause
        </Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          loading={updating}
          disabled={updating}
          onClick={() => onStatusChange(recommendation, 'DONE')}
        >
          Complete
        </Button>
      </Space>
    );
  }

  return <Tag color="success">Completed</Tag>;
}

function groupByPhase(recommendations: Recommendation[]) {
  return PHASE_ORDER.map((phase) => ({
    phase,
    items: recommendations
      .filter((item) => (item.roadmapPhase ?? 'CAREER_TRACK') === phase)
      .sort((a, b) => Number(b.priorityScore) - Number(a.priorityScore)),
  })).filter((group) => group.items.length > 0);
}

