'use client';

import {
  BranchesOutlined,
  CheckCircleFilled,
  CloseOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Empty, Popconfirm, Space, Tag, Typography } from 'antd';
import type {
  Recommendation,
  RoadmapPhase,
} from '@/types/domain';
import { StatusBadge } from '@/components/ui/StatusBadge';
import styles from './RecommendationTree.module.css';

const PHASE_ORDER: RoadmapPhase[] = [
  'CORE_FOUNDATION',
  'CAREER_TRACK',
  'SPECIALIZATION',
  'PRACTICE_PROJECT',
  'PORTFOLIO_PREPARATION',
];

const PHASE_LABEL: Record<RoadmapPhase, string> = {
  CORE_FOUNDATION: 'Core Foundation',
  CAREER_TRACK: 'Career Track',
  SPECIALIZATION: 'Specialization',
  PRACTICE_PROJECT: 'Practice Project',
  PORTFOLIO_PREPARATION: 'Portfolio Preparation',
};

interface RecommendationTreeProps {
  recommendations: Recommendation[];
  emptyDescription: string;
  showAnalysisAction?: boolean;
  updating: boolean;
  onAddToRoadmap: (recommendation: Recommendation) => void;
  onDismiss: (recommendation: Recommendation) => void;
}

interface SkillBranch {
  key: string;
  name: string;
  recommendations: Recommendation[];
}

interface PhaseBranch {
  phase: RoadmapPhase;
  skills: SkillBranch[];
}

export function RecommendationTree({
  recommendations,
  emptyDescription,
  showAnalysisAction = false,
  updating,
  onAddToRoadmap,
  onDismiss,
}: RecommendationTreeProps) {
  if (!recommendations.length) {
    return (
      <div className={styles.emptyState}>
        <Empty description={emptyDescription}>
          {showAnalysisAction ? (
            <Button type="primary" href="/student/analysis">
              Analyze Now
            </Button>
          ) : null}
        </Empty>
      </div>
    );
  }

  const branches = buildBranches(recommendations);

  return (
    <section className={styles.tree} aria-label="Recommendation tree">
      <div className={styles.rootNode}>
        <span className={styles.rootIcon}>
          <BranchesOutlined />
        </span>
        <div>
          <Typography.Title level={4} className={styles.rootTitle}>
            Development Recommendations
          </Typography.Title>
          <Typography.Text type="secondary">
            Explore by phase and skill, then add only the recommendations you want to follow.
          </Typography.Text>
        </div>
        <Tag color="blue" className={styles.rootCount}>
          {recommendations.length} suggestions
        </Tag>
      </div>

      <div className={styles.phaseList}>
        {branches.map((branch) => (
          <section className={styles.phaseBranch} key={branch.phase}>
            <div className={styles.phaseNode}>
              <FolderOpenOutlined />
              <Typography.Text strong>{PHASE_LABEL[branch.phase]}</Typography.Text>
              <span className={styles.countBadge}>
                {branch.skills.reduce(
                  (total, skill) => total + skill.recommendations.length,
                  0,
                )}
              </span>
            </div>

            <div className={styles.skillList}>
              {branch.skills.map((skill) => (
                <section className={styles.skillBranch} key={skill.key}>
                  <div className={styles.skillNode}>
                    <span className={styles.skillDot} />
                    <Typography.Text strong>{skill.name}</Typography.Text>
                    <Typography.Text type="secondary">
                      {skill.recommendations.length} recommendation
                      {skill.recommendations.length > 1 ? 's' : ''}
                    </Typography.Text>
                  </div>

                  <div className={styles.recommendationList}>
                    {skill.recommendations.map((recommendation) => (
                      <RecommendationNode
                        key={recommendation.id}
                        recommendation={recommendation}
                        updating={updating}
                        onAddToRoadmap={onAddToRoadmap}
                        onDismiss={onDismiss}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function RecommendationNode({
  recommendation,
  updating,
  onAddToRoadmap,
  onDismiss,
}: {
  recommendation: Recommendation;
  updating: boolean;
  onAddToRoadmap: (recommendation: Recommendation) => void;
  onDismiss: (recommendation: Recommendation) => void;
}) {
  const canAdd = recommendation.status === 'NEW';
  const canDismiss = recommendation.status === 'NEW' || recommendation.status === 'SAVED';
  const isSelected = ['SAVED', 'IN_PROGRESS', 'DONE'].includes(recommendation.status);

  return (
    <article
      className={`${styles.recommendationNode} ${
        isSelected ? styles.selectedRecommendation : ''
      }`}
      data-testid="recommendation-card"
    >
      <div className={styles.recommendationHeader}>
        <div className={styles.recommendationTitleBlock}>
          <Space size={8} wrap>
            <Typography.Title level={5} className={styles.recommendationTitle}>
              {recommendation.title}
            </Typography.Title>
            <StatusBadge status={recommendation.status} />
            {isSelected ? (
              <Tag color="success" icon={<CheckCircleFilled />}>
                Added to Roadmap
              </Tag>
            ) : null}
          </Space>
          <Typography.Text type="secondary">
            Priority {Number(recommendation.priorityScore).toFixed(0)}
          </Typography.Text>
        </div>

        <Space wrap className={styles.actions}>
          {canAdd ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={updating}
              disabled={updating}
              onClick={() => onAddToRoadmap(recommendation)}
            >
              Add to Roadmap
            </Button>
          ) : null}
          {canDismiss ? (
            <Popconfirm
              title="Dismiss this recommendation?"
              description="It will no longer appear in your active recommendations."
              okText="Dismiss"
              cancelText="Keep"
              onConfirm={() => onDismiss(recommendation)}
            >
              <Button danger icon={<CloseOutlined />} disabled={updating}>
                Dismiss
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </div>

      {recommendation.description || recommendation.reason ? (
        <div className={styles.recommendationCopy}>
          {recommendation.description ? (
            <Typography.Paragraph>{recommendation.description}</Typography.Paragraph>
          ) : null}
          {recommendation.reason ? (
            <Typography.Text type="secondary">Why: {recommendation.reason}</Typography.Text>
          ) : null}
        </div>
      ) : null}

      {recommendation.resources?.length ? (
        <div className={styles.resources}>
          <Typography.Text strong className={styles.resourceHeading}>
            Suggested resources
          </Typography.Text>
          <div className={styles.resourceList}>
            {recommendation.resources.map((resource) => (
              <div className={styles.resourceItem} key={resource.id}>
                <LinkOutlined />
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
                <Tag>{resource.resourceType}</Tag>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function buildBranches(recommendations: Recommendation[]): PhaseBranch[] {
  const grouped = new Map<RoadmapPhase, Map<string, SkillBranch>>();

  recommendations.forEach((recommendation) => {
    const phase = recommendation.roadmapPhase ?? 'CAREER_TRACK';
    const skillKey = recommendation.skill?.id ?? recommendation.skillId ?? 'general';
    const skillName = recommendation.skill?.name ?? 'General development';
    const phaseSkills = grouped.get(phase) ?? new Map<string, SkillBranch>();
    const skill = phaseSkills.get(skillKey) ?? {
      key: skillKey,
      name: skillName,
      recommendations: [],
    };

    skill.recommendations.push(recommendation);
    phaseSkills.set(skillKey, skill);
    grouped.set(phase, phaseSkills);
  });

  return PHASE_ORDER.filter((phase) => grouped.has(phase)).map((phase) => ({
    phase,
    skills: [...(grouped.get(phase)?.values() ?? [])]
      .map((skill) => ({
        ...skill,
        recommendations: skill.recommendations.sort(
          (a, b) => Number(b.priorityScore) - Number(a.priorityScore),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
