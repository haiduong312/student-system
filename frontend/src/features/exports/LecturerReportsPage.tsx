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
        title="Báo cáo và xuất dữ liệu"
        description="Xuất báo cáo trong phạm vi sinh viên được phân công cho bạn."
      />

      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card title="Xuất danh sách sinh viên được phân công">
          <Typography.Paragraph type="secondary">
            Backend tự xác định giảng viên hiện tại; báo cáo chỉ gồm phân công đang hiệu lực.
          </Typography.Paragraph>
          <Form<LecturerStudentsExportFormValues>
            form={lecturerStudentsForm}
            layout="vertical"
            initialValues={{ status: 'ACTIVE' }}
            onFinish={exportLecturerStudents}
          >
            <div style={filterGridStyle}>
              <Form.Item name="search" label="Tìm kiếm">
                <Input allowClear placeholder="Sinh viên, mã sinh viên hoặc email" />
              </Form.Item>
              <Form.Item name="status" label="Trạng thái phân công">
                <Select<AssignmentStatus>
                  options={[{ value: 'ACTIVE', label: 'ACTIVE' }]}
                />
              </Form.Item>
            </div>
            <Form.Item label="Sinh viên được phân công">
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
                  ? 'Đang xuất...'
                  : 'Xuất Excel sinh viên được phân công'}
              </Button>
              <Button
                disabled={lecturerStudentsExport.isPending}
                onClick={() => {
                  lecturerStudentsForm.resetFields();
                  setAssignmentStudent(null);
                }}
              >
                Đặt lại bộ lọc
              </Button>
            </Space>
          </Form>
        </Card>

        <Card title="Xuất báo cáo năng lực">
          <Typography.Paragraph type="secondary">
            Để trống sinh viên để xuất dữ liệu năng lực trong toàn bộ phạm vi được phân công.
          </Typography.Paragraph>
          <Form<CompetencyExportFormValues>
            form={competencyForm}
            layout="vertical"
            onFinish={exportCompetency}
          >
            <Form.Item label="Sinh viên được phân công">
              <AssignedStudentSelect
                student={competencyStudent}
                onChange={setCompetencyStudent}
              />
            </Form.Item>
            <div style={filterGridStyle}>
              <Form.Item name="status" label="Trạng thái kết quả">
                <Select<AnalysisResultStatus>
                  allowClear
                  options={[
                    { value: 'CURRENT', label: 'CURRENT' },
                    { value: 'OBSOLETE', label: 'OBSOLETE' },
                  ]}
                />
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
                onClick={() => {
                  competencyForm.resetFields();
                  setCompetencyStudent(null);
                }}
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
