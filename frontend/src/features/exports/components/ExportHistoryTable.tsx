'use client';

import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryState } from '@/components/ui/QueryState';
import { useCurrentUser } from '@/hooks/useAuth';
import { downloadPrivateFile } from '@/lib/private-files';
import {
  EXPORT_TYPES,
  type ExportHistoryItem,
  type ExportType,
} from '@/types/exports';
import { exportsService } from '../exports.service';
import { exportHistoryQueryKey } from '../use-export-mutations';

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  STUDENT_PORTFOLIO_PDF: 'Student portfolio PDF',
  STUDENTS_EXCEL: 'Students Excel',
  COMPETENCY_EXCEL: 'Competency Excel',
  LECTURER_STUDENTS_EXCEL: 'Lecturer students Excel',
};

export interface ExportHistoryTableProps {
  title?: string;
  initialPageSize?: number;
  initialExportType?: ExportType;
}

export function ExportHistoryTable({
  title = 'Export history',
  initialPageSize = 10,
  initialExportType,
}: ExportHistoryTableProps) {
  const { message } = App.useApp();
  const { data: currentUser } = useCurrentUser();
  const [exportType, setExportType] = useState<ExportType | undefined>(
    initialExportType,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const history = useQuery({
    queryKey: [...exportHistoryQueryKey, { exportType, page, pageSize }],
    queryFn: () =>
      exportsService.getExportHistory({
        exportType,
        page,
        pageSize,
      }),
  });

  const download = useMutation({
    mutationFn: (item: ExportHistoryItem) => downloadPrivateFile(item.fileUrl!),
    onSuccess: () => message.success('Tải file thành công.'),
    onError: () => message.error('Tạo file thành công nhưng tải file thất bại.'),
  });

  const showUserId = currentUser?.role === 'ADMIN';
  const columns: TableColumnsType<ExportHistoryItem> = [
    {
      title: 'Export type',
      dataIndex: 'exportType',
      width: 220,
      render: (value: ExportType) => <Tag>{EXPORT_TYPE_LABELS[value]}</Tag>,
    },
    ...(showUserId
      ? [
          {
            title: 'User ID',
            dataIndex: 'userId',
            width: 220,
            render: (value?: string | null) => value || '-',
          } satisfies TableColumnsType<ExportHistoryItem>[number],
        ]
      : []),
    {
      title: 'Created at',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'File',
      key: 'file',
      fixed: 'right',
      width: 130,
      render: (_value, item) => {
        if (!item.fileUrl) {
          return <Typography.Text type="secondary">Unavailable</Typography.Text>;
        }
        if (showUserId && item.userId !== currentUser?.id) {
          return <Typography.Text type="secondary">Chỉ chủ file</Typography.Text>;
        }

        const isDownloading = download.isPending && download.variables?.id === item.id;
        return (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={isDownloading}
            disabled={download.isPending && !isDownloading}
            onClick={() => download.mutate(item)}
          >
            {isDownloading ? 'Đang tải...' : 'Tải file'}
          </Button>
        );
      },
    },
  ];

  const handlePaginationChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? initialPageSize);
  };

  return (
    <Card>
      <Space
        wrap
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        <Space wrap>
          <Select<ExportType>
            allowClear
            placeholder="All export types"
            style={{ minWidth: 220 }}
            value={exportType}
            options={EXPORT_TYPES.map((value) => ({
              value,
              label: EXPORT_TYPE_LABELS[value],
            }))}
            onChange={(value) => {
              setExportType(value);
              setPage(1);
            }}
          />
          <Button
            aria-label="Refresh export history"
            icon={<ReloadOutlined />}
            loading={history.isFetching}
            onClick={() => history.refetch()}
          />
        </Space>
      </Space>

      <QueryState loading={history.isLoading && !history.data} error={history.error}>
        <Table<ExportHistoryItem>
          rowKey="id"
          columns={columns}
          dataSource={history.data?.data ?? []}
          loading={history.isFetching}
          scroll={{ x: 760 }}
          locale={{
            emptyText: <EmptyState description="Chưa có lịch sử export." />,
          }}
          pagination={{
            current: page,
            pageSize,
            total: history.data?.meta.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} exports`,
          }}
          onChange={handlePaginationChange}
        />
      </QueryState>
    </Card>
  );
}
