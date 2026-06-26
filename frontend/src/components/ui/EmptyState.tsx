import { Empty } from 'antd';
import type { ReactNode } from 'react';

export function EmptyState({
  description,
  children,
}: {
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description}>
      {children}
    </Empty>
  );
}
