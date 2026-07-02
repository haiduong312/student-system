'use client';

import { Alert, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import type { UpdateUserRequest, User } from '@/types/management';

interface UserFormValues {
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export function UserFormModal({
  open,
  user,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  user: User | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (userId: string, payload: UpdateUserRequest) => void;
}) {
  const [form] = Form.useForm<UserFormValues>();
  const hasProfile = Boolean(user?.student || user?.lecturer);
  const isStudent = Boolean(user?.student);

  useEffect(() => {
    if (!open || !user) return;
    form.resetFields();
    form.setFieldsValue({
      fullName: user.fullName,
      email: user.email,
      phone: user.student?.phone ?? user.lecturer?.phone ?? undefined,
      avatarUrl: user.student?.avatarUrl ?? undefined,
    });
  }, [form, open, user]);

  const submit = (values: UserFormValues) => {
    if (!user) return;
    const payload: UpdateUserRequest = {
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      ...(hasProfile ? { phone: optionalText(values.phone) } : {}),
      ...(isStudent ? { avatarUrl: optionalText(values.avatarUrl) } : {}),
    };
    onSubmit(user.id, payload);
  };

  return (
    <Modal
      title={user ? `Edit ${user.fullName}` : 'Edit user'}
      open={open}
      width={620}
      okText="Save changes"
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form<UserFormValues>
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={submit}
      >
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
        {hasProfile ? (
          <Form.Item name="phone" label="Phone" rules={[{ max: 30 }]}>
            <Input autoComplete="tel" maxLength={30} />
          </Form.Item>
        ) : (
          <Alert
            showIcon
            type="info"
            message="This account has no student or lecturer profile, so phone is not editable."
          />
        )}
        {isStudent ? (
          <Form.Item
            name="avatarUrl"
            label="Avatar URL"
            rules={[{ type: 'url', message: 'Enter a valid URL including its protocol.' }]}
          >
            <Input maxLength={500} placeholder="https://..." />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}
