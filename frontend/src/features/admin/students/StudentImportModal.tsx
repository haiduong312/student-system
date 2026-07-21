'use client';

import {
  CheckCircleOutlined,
  DownloadOutlined,
  InboxOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadProps } from 'antd';
import Papa from 'papaparse';
import { useEffect, useMemo, useState } from 'react';
import type {
  ImportStudentRecord,
  ImportStudentsRequest,
  ImportStudentsResult,
} from '@/types/management';

const IMPORT_FIELDS = [
  'email',
  'fullName',
  'studentCode',
  'password',
  'className',
  'major',
  'academicYear',
  'phone',
] as const;

type RequiredImportField = 'email' | 'fullName' | 'studentCode';

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

const csvTemplate = Papa.unparse([
  {
    email: 'student@example.edu',
    fullName: 'Student Name',
    studentCode: 'ST001',
    password: '',
    className: 'SE01',
    major: 'Software Engineering',
    academicYear: '2024-2028',
    phone: '',
  },
]);

interface PreparedRecord {
  key: number;
  row: number;
  raw: Record<string, unknown>;
  record?: ImportStudentRecord;
  errors: string[];
}

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
  const [mode, setMode] = useState<'file' | 'json'>('file');
  const [records, setRecords] = useState<PreparedRecord[]>([]);
  const [sourceName, setSourceName] = useState<string>();
  const [parseError, setParseError] = useState<string>();

  const invalidCount = useMemo(
    () => records.filter((record) => record.errors.length > 0).length,
    [records],
  );

  useEffect(() => {
    if (!open || result) return;
    form.resetFields();
    setMode('file');
    setRecords([]);
    setSourceName(undefined);
    setParseError(undefined);
  }, [form, open, result]);

  const reviewRecords = (values: unknown[], source: string) => {
    const prepared = values.map(prepareRecord);
    setRecords(prepared);
    setSourceName(source);
    setParseError(undefined);
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    void file
      .text()
      .then((content) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const values = extension === 'csv' ? parseCsv(content) : parseImportJson(content);
        reviewRecords(values, file.name);
      })
      .catch((error: unknown) => {
        setRecords([]);
        setSourceName(file.name);
        setParseError(error instanceof Error ? error.message : 'The selected file is invalid.');
      });
    return Upload.LIST_IGNORE;
  };

  const submitPreparedRecords = () => {
    const validRecords = records.flatMap((record) => (record.record ? [record.record] : []));
    if (!validRecords.length || invalidCount) return;
    onSubmit({ records: validRecords });
  };

  return (
    <Modal
      title={result ? 'Import result' : 'Import students'}
      open={open}
      width={960}
      okText={result ? 'Done' : `Import${records.length ? ` ${records.length} students` : ''}`}
      okButtonProps={{ disabled: !result && (!records.length || invalidCount > 0) }}
      cancelButtonProps={{ disabled: submitting, style: result ? { display: 'none' } : undefined }}
      confirmLoading={submitting}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={result ? onCancel : submitPreparedRecords}
      styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
    >
      {result ? (
        <ImportResult result={result} />
      ) : (
        <>
          <Tabs
            activeKey={mode}
            onChange={(key) => {
              setMode(key as 'file' | 'json');
              setRecords([]);
              setSourceName(undefined);
              setParseError(undefined);
            }}
            items={[
              {
                key: 'file',
                label: 'Upload file',
                children: (
                  <>
                    <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 12 }}>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => downloadTextFile('student-import-template.csv', csvTemplate)}
                      >
                        CSV template
                      </Button>
                    </Space>
                    <Upload.Dragger
                      aria-label="Upload student import file"
                      accept="application/json,text/csv,.json,.csv"
                      beforeUpload={beforeUpload}
                      showUploadList={false}
                      disabled={submitting}
                    >
                      <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                      <p className="ant-upload-text">Select a CSV or JSON file</p>
                      <p className="ant-upload-hint">Required columns: email, fullName, studentCode</p>
                    </Upload.Dragger>
                  </>
                ),
              },
              {
                key: 'json',
                label: 'Paste JSON',
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={() => {
                      setRecords([]);
                      setSourceName(undefined);
                      setParseError(undefined);
                    }}
                    onFinish={({ json }) => {
                      try {
                        reviewRecords(parseImportJson(json), 'Pasted JSON');
                      } catch (error) {
                        setRecords([]);
                        setParseError(error instanceof Error ? error.message : 'Invalid JSON.');
                      }
                    }}
                  >
                    <Form.Item
                      name="json"
                      label="Student records"
                      rules={[{ required: true, whitespace: true, message: 'Import data is required.' }]}
                    >
                      <Input.TextArea rows={10} placeholder={importExample} disabled={submitting} />
                    </Form.Item>
                    <Button onClick={() => form.submit()}>Review JSON</Button>
                  </Form>
                ),
              },
            ]}
          />

          {parseError ? (
            <Alert
              showIcon
              type="error"
              message="File could not be read"
              description={parseError}
              style={{ marginTop: 16 }}
            />
          ) : null}

          {records.length ? (
            <ImportPreview records={records} sourceName={sourceName} invalidCount={invalidCount} />
          ) : null}
        </>
      )}
    </Modal>
  );
}

function ImportPreview({
  records,
  sourceName,
  invalidCount,
}: {
  records: PreparedRecord[];
  sourceName?: string;
  invalidCount: number;
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space wrap>
          <Typography.Title level={5} style={{ margin: 0 }}>Import preview</Typography.Title>
          <Typography.Text type="secondary">{sourceName}</Typography.Text>
        </Space>
        {invalidCount ? (
          <Tag icon={<WarningOutlined />} color="error">{invalidCount} invalid</Tag>
        ) : (
          <Tag icon={<CheckCircleOutlined />} color="success">{records.length} ready</Tag>
        )}
      </Space>
      <Table
        size="small"
        rowKey="key"
        pagination={records.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
        scroll={{ x: 880 }}
        dataSource={records}
        columns={[
          { title: 'Row', dataIndex: 'row', width: 64 },
          { title: 'Email', width: 220, render: (_, item) => displayValue(item.raw.email) },
          { title: 'Full name', width: 180, render: (_, item) => displayValue(item.raw.fullName) },
          { title: 'Student code', width: 130, render: (_, item) => displayValue(item.raw.studentCode) },
          { title: 'Class', width: 110, render: (_, item) => displayValue(item.raw.className) },
          {
            title: 'Validation',
            width: 230,
            render: (_, item) =>
              item.errors.length ? (
                <Typography.Text type="danger">{item.errors.join('; ')}</Typography.Text>
              ) : (
                <Tag color="success">Ready</Tag>
              ),
          },
        ]}
      />
    </div>
  );
}

function ImportResult({ result }: { result: ImportStudentsResult }) {
  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}><Statistic title="Created" value={result.created} /></Col>
        <Col xs={24} sm={8}><Statistic title="Skipped" value={result.skipped} /></Col>
        <Col xs={24} sm={8}><Statistic title="Failed" value={result.failed} /></Col>
      </Row>
      {result.data.length ? (
        <>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Created students</Typography.Title>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadCredentials(result)}
            >
              Download credentials
            </Button>
          </Space>
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
                  value ? <Typography.Text code copyable>{value}</Typography.Text> : 'Provided',
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
            scroll={{ x: 700 }}
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

function parseCsv(value: string) {
  const parsed = Papa.parse<Record<string, unknown>>(value, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });
  const fatalError = parsed.errors.find((error) => error.type !== 'FieldMismatch');
  if (fatalError) {
    throw new Error(`CSV row ${(fatalError.row ?? 0) + 2}: ${fatalError.message}`);
  }
  if (!parsed.data.length) {
    throw new Error('The CSV file does not contain any student records.');
  }

  return parsed.data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, cell]) => [key, typeof cell === 'string' ? cell.trim() : cell]),
    ),
  );
}

function parseImportJson(value: string): unknown[] {
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
  return records;
}

function prepareRecord(value: unknown, index: number): PreparedRecord {
  const row = index + 1;
  if (!isRecord(value)) {
    return { key: row, row, raw: {}, errors: ['Record must be an object.'] };
  }

  const errors: string[] = [];
  const unknownFields = Object.keys(value).filter(
    (field) => !IMPORT_FIELDS.includes(field as (typeof IMPORT_FIELDS)[number]),
  );
  if (unknownFields.length) errors.push(`Unknown fields: ${unknownFields.join(', ')}`);

  const email = requiredString(value, 'email', 191, errors)?.toLowerCase();
  const fullName = requiredString(value, 'fullName', 150, errors);
  const studentCode = requiredString(value, 'studentCode', 50, errors);
  const password = optionalString(value, 'password', 128, errors);
  const className = optionalString(value, 'className', 100, errors);
  const major = optionalString(value, 'major', 150, errors);
  const academicYear = optionalString(value, 'academicYear', 20, errors);
  const phone = optionalString(value, 'phone', 30, errors);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email is invalid.');
  if (password && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
    errors.push('Password must be at least 8 characters and contain a letter and a number.');
  }

  const record = errors.length || !email || !fullName || !studentCode
    ? undefined
    : {
        email,
        fullName,
        studentCode,
        ...(password ? { password } : {}),
        ...(className ? { className } : {}),
        ...(major ? { major } : {}),
        ...(academicYear ? { academicYear } : {}),
        ...(phone ? { phone } : {}),
      };

  return { key: row, row, raw: value, record, errors };
}

function requiredString(
  value: Record<string, unknown>,
  field: RequiredImportField,
  maxLength: number,
  errors: string[],
) {
  const normalized = optionalString(value, field, maxLength, errors);
  if (!normalized) errors.push(`${field} is required.`);
  return normalized;
}

function optionalString(
  value: Record<string, unknown>,
  field: (typeof IMPORT_FIELDS)[number],
  maxLength: number,
  errors: string[],
) {
  const raw = value[field];
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string') {
    errors.push(`${field} must be text.`);
    return undefined;
  }
  const normalized = raw.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) errors.push(`${field} exceeds ${maxLength} characters.`);
  return normalized;
}

function downloadCredentials(result: ImportStudentsResult) {
  const content = Papa.unparse(
    result.data.map((record) => ({
      email: record.email,
      studentCode: record.studentCode,
      temporaryPassword: record.temporaryPassword ?? '',
    })),
  );
  downloadTextFile('student-import-credentials.csv', content);
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function displayValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : '-';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function valueOrDash(value?: string | null) {
  return value || '-';
}
