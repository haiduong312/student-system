'use client';

import { DatePicker, Divider, Form, Input, Modal, Row, Col } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';
import type {
  CreateStudentRequest,
  Student,
  UpdateStudentRequest,
} from '@/types/management';

interface StudentFormValues {
  email: string;
  fullName: string;
  password?: string;
  studentCode: string;
  className?: string;
  major?: string;
  academicYear?: string;
  phone?: string;
  dateOfBirth?: Dayjs | null;
  avatarUrl?: string;
  summary?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export type StudentFormSubmission =
  | { mode: 'create'; payload: CreateStudentRequest }
  | { mode: 'update'; studentId: string; payload: UpdateStudentRequest };

export function StudentFormModal({
  open,
  student,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  student: Student | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (submission: StudentFormSubmission) => void;
}) {
  const [form] = Form.useForm<StudentFormValues>();
  const editing = Boolean(student);

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    if (student) {
      form.setFieldsValue({
        email: student.user.email,
        fullName: student.user.fullName,
        studentCode: student.studentCode,
        className: student.className ?? undefined,
        major: student.major ?? undefined,
        academicYear: student.academicYear ?? undefined,
        phone: student.phone ?? undefined,
        dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth) : null,
        avatarUrl: student.avatarUrl ?? undefined,
        summary: student.profile?.summary ?? undefined,
        githubUrl: student.profile?.githubUrl ?? undefined,
        linkedinUrl: student.profile?.linkedinUrl ?? undefined,
        portfolioUrl: student.profile?.portfolioUrl ?? undefined,
      });
    }
  }, [form, open, student]);

  const submit = (values: StudentFormValues) => {
    const sharedPayload: UpdateStudentRequest = {
      email: values.email.trim().toLowerCase(),
      fullName: values.fullName.trim(),
      studentCode: values.studentCode.trim(),
      className: optionalText(values.className),
      major: optionalText(values.major),
      academicYear: optionalText(values.academicYear),
      phone: optionalText(values.phone),
      dateOfBirth: values.dateOfBirth?.format('YYYY-MM-DD') ?? null,
      avatarUrl: optionalText(values.avatarUrl),
      summary: optionalText(values.summary),
      githubUrl: optionalText(values.githubUrl),
      linkedinUrl: optionalText(values.linkedinUrl),
      portfolioUrl: optionalText(values.portfolioUrl),
    };

    if (student) {
      onSubmit({ mode: 'update', studentId: student.id, payload: sharedPayload });
      return;
    }

    onSubmit({
      mode: 'create',
      payload: {
        ...sharedPayload,
        email: values.email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        studentCode: values.studentCode.trim(),
        password: values.password ?? '',
      },
    });
  };

  return (
    <Modal
      title={editing ? 'Edit student' : 'Create student'}
      open={open}
      width={860}
      okText={editing ? 'Save changes' : 'Create student'}
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form<StudentFormValues>
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={submit}
      >
        <Divider orientation="left">Account</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="fullName"
              label="Full name"
              rules={[
                { required: true, whitespace: true, message: 'Full name is required.' },
                { max: 150 },
              ]}
            >
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required.' },
                { type: 'email', message: 'Enter a valid email address.' },
                { max: 191 },
              ]}
            >
              <Input autoComplete="email" maxLength={191} />
            </Form.Item>
          </Col>
          {!editing ? (
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="Initial password"
                rules={[
                  { required: true, message: 'Password is required.' },
                  { min: 8, max: 128 },
                  {
                    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                    message: 'Password must contain at least one letter and one number.',
                  },
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={24} md={12}>
            <Form.Item
              name="studentCode"
              label="Student code"
              rules={[
                { required: true, whitespace: true, message: 'Student code is required.' },
                { max: 50 },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Academic information</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="className" label="Class" rules={[{ max: 100 }]}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="major" label="Major" rules={[{ max: 150 }]}>
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="academicYear" label="Academic year" rules={[{ max: 20 }]}>
              <Input maxLength={20} placeholder="Example: 2024-2028" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Phone" rules={[{ max: 30 }]}>
              <Input autoComplete="tel" maxLength={30} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="dateOfBirth" label="Date of birth">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="avatarUrl"
              label="Avatar URL"
              rules={[{ type: 'url', message: 'Enter a valid URL including its protocol.' }]}
            >
              <Input maxLength={500} placeholder="https://..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Profile</Divider>
        <Form.Item name="summary" label="Summary" rules={[{ max: 3000 }]}>
          <Input.TextArea rows={3} maxLength={3000} showCount />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="githubUrl"
              label="GitHub URL"
              rules={[{ type: 'url', message: 'Enter a valid URL including its protocol.' }]}
            >
              <Input maxLength={500} placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="linkedinUrl"
              label="LinkedIn URL"
              rules={[{ type: 'url', message: 'Enter a valid URL including its protocol.' }]}
            >
              <Input maxLength={500} placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="portfolioUrl"
              label="Portfolio URL"
              rules={[{ type: 'url', message: 'Enter a valid URL including its protocol.' }]}
            >
              <Input maxLength={500} placeholder="https://..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}
