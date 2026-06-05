import { Typography } from 'antd';

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        {title}
      </Typography.Title>
      {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
    </div>
  );
}
