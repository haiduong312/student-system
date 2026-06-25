import { Alert, Spin } from 'antd';
import { getApiErrorMessage } from '@/lib/errors';

export function QueryState({
  loading,
  error,
  children,
}: {
  loading?: boolean;
  error?: unknown;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div style={{ display: 'grid', minHeight: 220, placeItems: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" showIcon message={getApiErrorMessage(error)} />;
  }

  return children;
}
