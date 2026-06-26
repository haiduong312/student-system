import { Alert } from 'antd';
import type { ReactNode } from 'react';

type CurrentGoalCardTone = 'success' | 'info' | 'warning' | 'error';

export function CurrentGoalCard({
  contextLabel,
  description,
  tone = 'info',
  action,
}: {
  contextLabel: string;
  description?: ReactNode;
  tone?: CurrentGoalCardTone;
  action?: ReactNode;
}) {
  return (
    <Alert
      showIcon
      type={tone}
      message={`Current context: ${contextLabel}`}
      description={description}
      action={action}
    />
  );
}
