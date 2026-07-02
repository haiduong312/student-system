'use client';

import { InboxOutlined } from '@ant-design/icons';
import { Alert, Col, Form, Input, Modal, Row, Statistic, Table, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect } from 'react';
import type {
  ImportStudentRecord,
  ImportStudentsRequest,
  ImportStudentsResult,
} from '@/types/management';

const importExample = JSON.stringify(
  {
    records: [
      {
        email: 'student@example.edu',
        fullName: 'Student Name',
        studentCode: 'ST001',
        className: 'SE01',
        major: 'Software Engineering',
        academicYear: '2024-2028',
      },
    ],
  },
  null,
  2,
);

export function StudentImportModal({
  open,
  submitting,
  result,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  submitting?: boolean;
  result: ImportStudentsResult | null;
  onCancel: () => void;
  onSubmit: (payload: ImportStudentsRequest) => void;
}) {
  const [form] = Form.useForm<{ json: string }>();

  useEffect(() => {
    if (open && !result) {
      form.resetFields();
    }
  }, [form, open, result]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    void file.text().then((json) => form.setFieldValue('json', json));
    return Upload.LIST_IGNORE;
  };

  return (
    <Modal
      title={result ? 'Import result' : 'Import students'}
      open={open}
      width={900}
      okText={result ? 'Done' : 'Import students'}
      cancelButtonProps={{ disabled: submitting, style: result ? { display: 'none' } : undefined }}
      confirmLoading={submitting}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={result ? onCancel : () => form.submit()}
    >
      {result ? (
        <ImportResult result={result} />
      ) : (
        <Form form={form} layout="vertical" onFinish={({ json }) => onSubmit(parseImportJson(json))}>
          <Alert
            showIcon
            type="info"
            message="Import format"
            description="Upload or paste JSON containing an array of students, or an object with a records array. Password is optional; the backend generates a temporary password when omitted."
            style={{ marginBottom: 16 }}
          />
          <Upload.Dragger
            accept="application/json,.json"
            beforeUpload={beforeUpload}
            showUploadList={false}
            disabled={submitting}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Choose a JSON file</p>
            <p className="ant-upload-hint">The file is read locally and sent as JSON.</p>
          </Upload.Dragger>
          <Form.Item
            name="json"
            label="Student records"
            rules={[
              { required: true, whitespace: true, message: 'Import data is required.' },
              {
                validator: async (_rule, value: string | undefined) => {
                  if (!value?.trim()) return;
                  try {
                    parseImportJson(value);
                  } catch (error) {
                    throw new Error(error instanceof Error ? error.message : 'Invalid import data.');
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={14} placeholder={importExample} disabled={submitting} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

function ImportResult({ result }: { result: ImportStudentsResult }) {
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}><Statistic title="Created" value={result.created} /></Col>
        <Col span={8}><Statistic title="Skipped" value={result.skipped} /></Col>
        <Col span={8}><Statistic title="Failed" value={result.failed} /></Col>
      </Row>
      {result.data.length ? (
        <>
          <Typography.Title level={5}>Created students</Typography.Title>
          <Table
            size="small"
            rowKey="row"
            pagination={false}
            scroll={{ x: 700 }}
            dataSource={result.data}
            columns={[
              { title: 'Row', dataIndex: 'row', width: 70 },
              { title: 'Email', dataIndex: 'email' },
              { title: 'Student code', dataIndex: 'studentCode' },
              {
                title: 'Temporary password',
                dataIndex: 'temporaryPassword',
                render: (value?: string) =>
                  value ? <Typography.Text code copyable>{value}</Typography.Text> : '-',
              },
            ]}
          />
        </>
      ) : null}
      {result.errors.length ? (
        <>
          <Typography.Title level={5} style={{ marginTop: 20 }}>Skipped or failed rows</Typography.Title>
          <Table
            size="small"
            rowKey={(row) => `${row.row}-${row.email ?? row.studentCode ?? 'error'}`}
            pagination={false}
            dataSource={result.errors}
            columns={[
              { title: 'Row', dataIndex: 'row', width: 70 },
              { title: 'Email', dataIndex: 'email', render: valueOrDash },
              { title: 'Student code', dataIndex: 'studentCode', render: valueOrDash },
              { title: 'Reason', dataIndex: 'reason' },
            ]}
          />
        </>
      ) : null}
    </>
  );
}

function parseImportJson(value: string): ImportStudentsRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Enter valid JSON.');
  }

  const records = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.records)
      ? parsed.records
      : null;

  if (!records?.length) {
    throw new Error('Import data must contain at least one student record.');
  }
  if (!records.every(isImportStudentRecord)) {
    throw new Error('Every record requires a valid email, fullName, and studentCode.');
  }

  return { records };
}

function isImportStudentRecord(value: unknown): value is ImportStudentRecord {
  return Boolean(
    isRecord(value) &&
      typeof value.email === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) &&
      typeof value.fullName === 'string' &&
      value.fullName.trim() &&
      typeof value.studentCode === 'string' &&
      value.studentCode.trim(),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function valueOrDash(value?: string | null) {
  return value || '-';
}
