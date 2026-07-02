'use client';

import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import type { UserStatus } from '@/types/management';

export interface LecturerFilters {
  search?: string;
  department?: string;
  status?: UserStatus;
}

export function LecturerFilterBar({
  filters,
  refreshing,
  actions,
  onApply,
  onRefresh,
}: {
  filters: LecturerFilters;
  refreshing?: boolean;
  actions?: React.ReactNode;
  onApply: (filters: LecturerFilters) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<LecturerFilters>(filters);

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
            placeholder="Name, email, or lecturer code"
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            value={draft.search}
            onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
            onPressEnter={apply}
          />
          <Input
            allowClear
            placeholder="Department"
            style={{ width: 220 }}
            value={draft.department}
            onChange={(event) =>
              setDraft((current) => ({ ...current, department: event.target.value }))
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
            aria-label="Refresh lecturers"
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

function normalizeFilters(filters: LecturerFilters): LecturerFilters {
  return Object.fromEntries(
    Object.entries(filters).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized ? [[key, normalized]] : [];
      }
      return value === undefined ? [] : [[key, value]];
    }),
  ) as LecturerFilters;
}
