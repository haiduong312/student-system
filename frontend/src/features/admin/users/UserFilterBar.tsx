'use client';

import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import type { UserRole } from '@/types/auth';
import type { UserStatus } from '@/types/management';

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export function UserFilterBar({
  filters,
  refreshing,
  onApply,
  onRefresh,
}: {
  filters: UserFilters;
  refreshing?: boolean;
  onApply: (filters: UserFilters) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<UserFilters>(filters);

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
      <Space wrap>
        <Input
          allowClear
          placeholder="Name, email, student or lecturer code"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={draft.search}
          onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
          onPressEnter={apply}
        />
        <Select<UserRole>
          allowClear
          placeholder="Role"
          style={{ width: 140 }}
          value={draft.role}
          options={[
            { value: 'ADMIN', label: 'ADMIN' },
            { value: 'LECTURER', label: 'LECTURER' },
            { value: 'STUDENT', label: 'STUDENT' },
          ]}
          onChange={(role) => setDraft((current) => ({ ...current, role }))}
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
          aria-label="Refresh users"
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={onRefresh}
        />
      </Space>
    </Card>
  );
}

function normalizeFilters(filters: UserFilters): UserFilters {
  return Object.fromEntries(
    Object.entries(filters).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized ? [[key, normalized]] : [];
      }
      return value === undefined ? [] : [[key, value]];
    }),
  ) as UserFilters;
}
