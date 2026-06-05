import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

export function MetricCard({
  title,
  value,
  suffix,
  icon,
}: {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <Statistic title={title} value={value} suffix={suffix} prefix={icon} />
    </Card>
  );
}
