'use client';

import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import type { AssignmentStatus } from '@/types/management';
import { LecturerSelect, StudentSelect } from './AdvisorEntitySelects';

export interface AdvisorAssignmentFilters {
  search?: string;
  lecturerId?: string;
  studentId?: string;
  status?: AssignmentStatus;
}

export function AdvisorAssignmentFilterBar({
  filters,
  refreshing,
  actions,
  onApply,
  onRefresh,
}: {
  filters: AdvisorAssignmentFilters;
  refreshing?: boolean;
  actions?: React.ReactNode;
  onApply: (filters: AdvisorAssignmentFilters) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<AdvisorAssignmentFilters>(filters);

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
            placeholder="Search lecturer or student"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            value={draft.search}
            onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
            onPressEnter={apply}
          />
          <LecturerSelect
            allowClear
            placeholder="Filter lecturer"
            style={{ width: 240 }}
            value={draft.lecturerId}
            onChange={(lecturerId) => setDraft((current) => ({ ...current, lecturerId }))}
          />
          <StudentSelect
            allowClear
            placeholder="Filter student"
            style={{ width: 240 }}
            value={draft.studentId}
            onChange={(studentId) => setDraft((current) => ({ ...current, studentId }))}
          />
          <Select<AssignmentStatus>
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
            Apply
          </Button>
          <Button onClick={clear}>Clear</Button>
          <Button
            aria-label="Refresh advisor assignments"
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

function normalizeFilters(filters: AdvisorAssignmentFilters): AdvisorAssignmentFilters {
  return Object.fromEntries(
    Object.entries(filters).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized ? [[key, normalized]] : [];
      }
      return value === undefined ? [] : [[key, value]];
    }),
  ) as AdvisorAssignmentFilters;
}
