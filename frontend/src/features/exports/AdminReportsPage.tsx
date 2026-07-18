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
        title="Reports and Data Export"
        description="Export filtered data and download previously generated files."
      />

      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card title="Export Student List">
          <Typography.Paragraph type="secondary">
            Leave the filters blank to export all students in the Admin scope.
          </Typography.Paragraph>
          <Form<StudentsExportFormValues>
            form={studentsForm}
            layout="vertical"
            onFinish={exportStudents}
          >
            <div style={filterGridStyle}>
              <Form.Item name="search" label="Search">
                <Input allowClear placeholder="Full name, email, or student code" />
              </Form.Item>
              <Form.Item name="className" label="Class">
                <Input allowClear />
              </Form.Item>
              <Form.Item name="major" label="Major">
                <Input allowClear />
              </Form.Item>
              <Form.Item name="academicYear" label="Academic Year">
                <Input allowClear />
              </Form.Item>
              <Form.Item name="status" label="Status">
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
                  ? 'Exporting...'
                  : 'Export Student List to Excel'}
              </Button>
              <Button
                disabled={studentsExport.isPending}
                onClick={() => studentsForm.resetFields()}
              >
                Reset Filters
              </Button>
            </Space>
          </Form>
        </Card>

        <Card title="Export Competency Report">
          <Typography.Paragraph type="secondary">
            Limit the report by student and analysis period.
          </Typography.Paragraph>
          <Form<CompetencyExportFormValues>
            form={competencyForm}
            layout="vertical"
            onFinish={exportCompetency}
          >
            <div style={filterGridStyle}>
              <Form.Item name="studentId" label="Student ID">
                <Input allowClear placeholder="Leave blank to export the full Admin scope" />
              </Form.Item>
              <Form.Item name="analyzedAt" label="Analysis Period">
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
                  ? 'Exporting...'
                  : 'Export Competency Report to Excel'}
              </Button>
              <Button
                disabled={competencyExport.isPending}
                onClick={() => competencyForm.resetFields()}
              >
                Reset Filters
              </Button>
            </Space>
          </Form>
        </Card>

        <ExportHistoryTable title="Export History" initialPageSize={20} />
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
