'use client';

import { Checkbox, Empty, List, Space, Typography } from 'antd';
import type { Recommendation } from '@/types/domain';
import styles from './SuggestedActions.module.css';

interface SuggestedActionsProps {
  recommendations: Recommendation[];
  loading?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
}

export function SuggestedActions({
  recommendations,
  loading = false,
  selectedIds,
  onSelectedIdsChange,
}: SuggestedActionsProps) {
  const selectable = Boolean(selectedIds && onSelectedIdsChange);

  return (
    <List<Recommendation>
      className={styles.list}
      loading={loading}
      dataSource={recommendations}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No suggested actions for the current analysis."
          />
        ),
      }}
      renderItem={(recommendation) => {
        const checked = selectedIds?.includes(recommendation.id) ?? false;
        const resourceCount = recommendation.resources?.length ?? 0;

        return (
          <List.Item
            className={styles.item}
            data-testid="suggested-action"
          >
            {selectable ? (
              <Checkbox
                aria-label={`Include suggestion ${recommendation.title}`}
                checked={checked}
                onChange={(event) => {
                  if (!selectedIds || !onSelectedIdsChange) return;

                  onSelectedIdsChange(
                    event.target.checked
                      ? [...selectedIds, recommendation.id]
                      : selectedIds.filter((id) => id !== recommendation.id),
                  );
                }}
              />
            ) : null}
            <div className={styles.content}>
              <Typography.Text strong>{recommendation.title}</Typography.Text>
              <Space size={12} wrap className={styles.meta}>
                <Typography.Text>
                  {recommendation.skill?.name ??
                    recommendation.skillId ??
                    'General development'}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {resourceCount} learning {resourceCount === 1 ? 'resource' : 'resources'}
                </Typography.Text>
              </Space>
              <Typography.Paragraph
                type="secondary"
                className={styles.reason}
              >
                {recommendation.reason ??
                  recommendation.description ??
                  'No additional rationale provided.'}
              </Typography.Paragraph>
            </div>
          </List.Item>
        );
      }}
    />
  );
}
