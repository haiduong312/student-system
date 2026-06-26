import { Tag } from 'antd';
import {
  getStatusColor,
  getStatusLabel,
  type StatusBadgeValue,
} from '@/lib/status';

export function StatusBadge({ status }: { status?: StatusBadgeValue | null }) {
  if (!status) {
    return <Tag>-</Tag>;
  }

  return <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>;
}
