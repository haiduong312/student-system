'use client';

import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import type { UserStatus } from '@/types/management';

export interface StudentFilters {
  search?: string;
  className?: string;
  major?: string;
  academicYear?: string;
  status?: UserStatus;
}

export function StudentFilterBar({
  filters,
  refreshing,
  actions,
  onApply,
  onRefresh,
}: {
  filters: StudentFilters;
  refreshing?: boolean;
  actions?: React.ReactNode;
  onApply: (filters: StudentFilters) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<StudentFilters>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const apply = () => onApply(normalizeFilters(draft));
  const clear = () => {
    setDraft({});
    onApply({});
  };

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            allowClear
            placeholder="Name, email, or student code"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            value={draft.search}
            onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
            onPressEnter={apply}
          />
          <Input
            allowClear
            placeholder="Class"
            style={{ width: 140 }}
            value={draft.className}
            onChange={(event) =>
              setDraft((current) => ({ ...current, className: event.target.value }))
            }
            onPressEnter={apply}
          />
          <Input
            allowClear
            placeholder="Major"
            style={{ width: 180 }}
            value={draft.major}
            onChange={(event) => setDraft((current) => ({ ...current, major: event.target.value }))}
            onPressEnter={apply}
          />
          <Input
            allowClear
            placeholder="Academic year"
            style={{ width: 150 }}
            value={draft.academicYear}
            onChange={(event) =>
              setDraft((current) => ({ ...current, academicYear: event.target.value }))
            }
            onPressEnter={apply}
          />
          <Select<UserStatus>
            allowClear
            placeholder="Status"
            style={{ width: 130 }}
            value={draft.status}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
            ]}
            onChange={(status) => setDraft((current) => ({ ...current, status }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={apply}>
            Search
          </Button>
          <Button onClick={clear}>Clear</Button>
          <Button
            aria-label="Refresh students"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={onRefresh}
          />
        </Space>
        <Space wrap>{actions}</Space>
      </Space>
    </Card>
  );
}

function normalizeFilters(filters: StudentFilters): StudentFilters {
  return Object.fromEntries(
    Object.entries(filters).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized ? [[key, normalized]] : [];
      }
      return value === undefined ? [] : [[key, value]];
    }),
  ) as StudentFilters;
}
