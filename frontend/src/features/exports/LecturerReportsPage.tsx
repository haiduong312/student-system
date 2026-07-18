'use client';

import { FileExcelOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, Select, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AssignedStudentSelect } from '@/features/lecturer/reviews/AssignedStudentSelect';
import type { AnalysisResultStatus } from '@/types/domain';
import type {
  ExportCompetencyExcelPayload,
  ExportLecturerStudentsExcelPayload,
} from '@/types/exports';
import type { AssignmentStatus, Student } from '@/types/management';
import { ExportHistoryTable } from './components/ExportHistoryTable';
import {
  useExportCompetencyExcel,
  useExportLecturerStudentsExcel,
} from './use-export-mutations';

const { RangePicker } = DatePicker;

interface LecturerStudentsExportFormValues {
  search?: string;
  status: AssignmentStatus;
}

interface CompetencyExportFormValues {
  status?: AnalysisResultStatus;
  analyzedAt?: [Dayjs, Dayjs];
}

export function LecturerReportsPage() {
  const [lecturerStudentsForm] = Form.useForm<LecturerStudentsExportFormValues>();
  const [competencyForm] = Form.useForm<CompetencyExportFormValues>();
  const [assignmentStudent, setAssignmentStudent] = useState<Student | null>(null);
  const [competencyStudent, setCompetencyStudent] = useState<Student | null>(null);
  const lecturerStudentsExport = useExportLecturerStudentsExcel();
  const competencyExport = useExportCompetencyExcel();

  const exportLecturerStudents = (values: LecturerStudentsExportFormValues) => {
    const payload: ExportLecturerStudentsExcelPayload = {
      search: normalizeOptionalText(values.search),
      studentId: assignmentStudent?.id,
      status: values.status,
    };

    lecturerStudentsExport.mutate(payload);
  };

  const exportCompetency = (values: CompetencyExportFormValues) => {
    const [fromDate, toDate] = values.analyzedAt ?? [];
    const payload: ExportCompetencyExcelPayload = {
      studentId: competencyStudent?.id,
      status: values.status,
      fromDate: fromDate?.startOf('day').toISOString(),
      toDate: toDate?.endOf('day').toISOString(),
    };

    competencyExport.mutate(payload);
  };

  return (
    <>
      <PageHeader
        title="Reports and Data Export"
        description="Export reports for students assigned to you."
      />

      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card title="Export Assigned Student List">
          <Typography.Paragraph type="secondary">
            The report includes only your active student assignments.
          </Typography.Paragraph>
          <Form<LecturerStudentsExportFormValues>
            form={lecturerStudentsForm}
            layout="vertical"
            initialValues={{ status: 'ACTIVE' }}
            onFinish={exportLecturerStudents}
          >
            <div style={filterGridStyle}>
              <Form.Item name="search" label="Search">
                <Input allowClear placeholder="Student name, student code, or email" />
              </Form.Item>
              <Form.Item name="status" label="Assignment Status">
                <Select<AssignmentStatus>
                  options={[{ value: 'ACTIVE', label: 'ACTIVE' }]}
                />
              </Form.Item>
            </div>
            <Form.Item label="Assigned Student">
              <AssignedStudentSelect
                student={assignmentStudent}
                onChange={setAssignmentStudent}
              />
            </Form.Item>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={<FileExcelOutlined />}
                loading={lecturerStudentsExport.isPending}
                disabled={lecturerStudentsExport.isPending}
              >
                {lecturerStudentsExport.isPending
                  ? 'Exporting...'
                  : 'Export Assigned Students to Excel'}
              </Button>
              <Button
                disabled={lecturerStudentsExport.isPending}
                onClick={() => {
                  lecturerStudentsForm.resetFields();
                  setAssignmentStudent(null);
                }}
              >
                Reset Filters
              </Button>
            </Space>
          </Form>
        </Card>

        <Card title="Export Competency Report">
          <Typography.Paragraph type="secondary">
            Leave the student blank to export competency data for all active assignments.
          </Typography.Paragraph>
          <Form<CompetencyExportFormValues>
            form={competencyForm}
            layout="vertical"
            onFinish={exportCompetency}
          >
            <Form.Item label="Assigned Student">
              <AssignedStudentSelect
                student={competencyStudent}
                onChange={setCompetencyStudent}
              />
            </Form.Item>
            <div style={filterGridStyle}>
              <Form.Item name="status" label="Result Status">
                <Select<AnalysisResultStatus>
                  allowClear
                  options={[
                    { value: 'CURRENT', label: 'CURRENT' },
                    { value: 'OBSOLETE', label: 'OBSOLETE' },
                  ]}
                />
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
                onClick={() => {
                  competencyForm.resetFields();
                  setCompetencyStudent(null);
                }}
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
