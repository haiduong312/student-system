'use client';

import { FileExcelOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, Select, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { PageHeader } from '@/components/ui/PageHeader';
import type {
  ExportCompetencyExcelPayload,
  ExportStudentsExcelPayload,
} from '@/types/exports';
import type { UserStatus } from '@/types/management';
import { ExportHistoryTable } from './components/ExportHistoryTable';
import {
  useExportCompetencyExcel,
  useExportStudentsExcel,
} from './use-export-mutations';

const { RangePicker } = DatePicker;

interface StudentsExportFormValues {
  search?: string;
  className?: string;
  major?: string;
  academicYear?: string;
  status?: UserStatus;
}

interface CompetencyExportFormValues {
  studentId?: string;
  analyzedAt?: [Dayjs, Dayjs];
}

export function AdminReportsPage() {
  const [studentsForm] = Form.useForm<StudentsExportFormValues>();
  const [competencyForm] = Form.useForm<CompetencyExportFormValues>();
  const studentsExport = useExportStudentsExcel();
  const competencyExport = useExportCompetencyExcel();

  const exportStudents = (values: StudentsExportFormValues) => {
    const payload: ExportStudentsExcelPayload = {
      search: normalizeOptionalText(values.search),
      className: normalizeOptionalText(values.className),
      major: normalizeOptionalText(values.major),
      academicYear: normalizeOptionalText(values.academicYear),
      status: values.status,
    };

    studentsExport.mutate(payload);
  };

  const exportCompetency = (values: CompetencyExportFormValues) => {
    const [fromDate, toDate] = values.analyzedAt ?? [];
    const payload: ExportCompetencyExcelPayload = {
      studentId: normalizeOptionalText(values.studentId),
      fromDate: fromDate?.startOf('day').toISOString(),
      toDate: toDate?.endOf('day').toISOString(),
    };

    competencyExport.mutate(payload);
  };

  return (
    <>
      <PageHeader
        title="Báo cáo và xuất dữ liệu"
        description="Xuất dữ liệu theo bộ lọc và tải lại các file đã tạo."
      />

      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card title="Xuất danh sách sinh viên">
          <Typography.Paragraph type="secondary">
            Để trống bộ lọc để xuất toàn bộ sinh viên trong phạm vi Admin.
          </Typography.Paragraph>
          <Form<StudentsExportFormValues>
            form={studentsForm}
            layout="vertical"
            onFinish={exportStudents}
          >
            <div style={filterGridStyle}>
              <Form.Item name="search" label="Tìm kiếm">
                <Input allowClear placeholder="Họ tên, email hoặc mã sinh viên" />
              </Form.Item>
              <Form.Item name="className" label="Lớp">
                <Input allowClear />
              </Form.Item>
              <Form.Item name="major" label="Ngành">
                <Input allowClear />
              </Form.Item>
              <Form.Item name="academicYear" label="Niên khóa">
                <Input allowClear />
              </Form.Item>
              <Form.Item name="status" label="Trạng thái">
                <Select<UserStatus>
                  allowClear
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'INACTIVE', label: 'INACTIVE' },
                  ]}
                />
              </Form.Item>
            </div>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={<FileExcelOutlined />}
                loading={studentsExport.isPending}
                disabled={studentsExport.isPending}
              >
                {studentsExport.isPending
                  ? 'Đang xuất...'
                  : 'Xuất Excel danh sách sinh viên'}
              </Button>
              <Button
                disabled={studentsExport.isPending}
                onClick={() => studentsForm.resetFields()}
              >
                Đặt lại bộ lọc
              </Button>
            </Space>
          </Form>
        </Card>

        <Card title="Xuất báo cáo năng lực">
          <Typography.Paragraph type="secondary">
            Có thể giới hạn báo cáo theo sinh viên và thời gian phân tích.
          </Typography.Paragraph>
          <Form<CompetencyExportFormValues>
            form={competencyForm}
            layout="vertical"
            onFinish={exportCompetency}
          >
            <div style={filterGridStyle}>
              <Form.Item name="studentId" label="Student ID">
                <Input allowClear placeholder="Để trống để xuất theo phạm vi Admin" />
              </Form.Item>
              <Form.Item name="analyzedAt" label="Thời gian phân tích">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={<FileExcelOutlined />}
                loading={competencyExport.isPending}
                disabled={competencyExport.isPending}
              >
                {competencyExport.isPending
                  ? 'Đang xuất...'
                  : 'Xuất Excel báo cáo năng lực'}
              </Button>
              <Button
                disabled={competencyExport.isPending}
                onClick={() => competencyForm.resetFields()}
              >
                Đặt lại bộ lọc
              </Button>
            </Space>
          </Form>
        </Card>

        <ExportHistoryTable title="Lịch sử export" initialPageSize={20} />
      </Space>
    </>
  );
}

const filterGridStyle = {
  display: 'grid',
  gap: '0 16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}
