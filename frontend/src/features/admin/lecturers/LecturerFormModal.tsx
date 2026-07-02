'use client';

import { Col, Divider, Form, Input, Modal, Row } from 'antd';
import { useEffect } from 'react';
import type {
  CreateLecturerRequest,
  Lecturer,
  UpdateLecturerRequest,
} from '@/types/management';

interface LecturerFormValues {
  email: string;
  fullName: string;
  password?: string;
  lecturerCode: string;
  department?: string;
  phone?: string;
  academicTitle?: string;
}

export type LecturerFormSubmission =
  | { mode: 'create'; payload: CreateLecturerRequest }
  | { mode: 'update'; lecturerId: string; payload: UpdateLecturerRequest };

export function LecturerFormModal({
  open,
  lecturer,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  lecturer: Lecturer | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (submission: LecturerFormSubmission) => void;
}) {
  const [form] = Form.useForm<LecturerFormValues>();
  const editing = Boolean(lecturer);

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    if (lecturer) {
      form.setFieldsValue({
        email: lecturer.user.email,
        fullName: lecturer.user.fullName,
        lecturerCode: lecturer.lecturerCode,
        department: lecturer.department ?? undefined,
        phone: lecturer.phone ?? undefined,
        academicTitle: lecturer.academicTitle ?? undefined,
      });
    }
  }, [form, lecturer, open]);

  const submit = (values: LecturerFormValues) => {
    const updatePayload: UpdateLecturerRequest = {
      email: values.email.trim().toLowerCase(),
      fullName: values.fullName.trim(),
      lecturerCode: values.lecturerCode.trim(),
      department: optionalText(values.department),
      phone: optionalText(values.phone),
      academicTitle: optionalText(values.academicTitle),
    };

    if (lecturer) {
      onSubmit({ mode: 'update', lecturerId: lecturer.id, payload: updatePayload });
      return;
    }

    onSubmit({
      mode: 'create',
      payload: {
        ...updatePayload,
        email: values.email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        lecturerCode: values.lecturerCode.trim(),
        password: values.password ?? '',
      },
    });
  };

  return (
    <Modal
      title={editing ? 'Edit lecturer' : 'Create lecturer'}
      open={open}
      width={760}
      okText={editing ? 'Save changes' : 'Create lecturer'}
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form<LecturerFormValues>
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
              name="lecturerCode"
              label="Lecturer code"
              rules={[
                { required: true, whitespace: true, message: 'Lecturer code is required.' },
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
            <Form.Item name="academicTitle" label="Academic title" rules={[{ max: 100 }]}>
              <Input maxLength={100} placeholder="Example: Associate Professor" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="department" label="Department" rules={[{ max: 150 }]}>
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Phone" rules={[{ max: 30 }]}>
              <Input autoComplete="tel" maxLength={30} />
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
