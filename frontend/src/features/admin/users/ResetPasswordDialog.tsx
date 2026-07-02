'use client';

import { Alert, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import type { ResetPasswordRequest, User } from '@/types/management';

interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export function ResetPasswordDialog({
  user,
  open,
  submitting,
  onCancel,
  onSubmit,
}: {
  user: User | null;
  open: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (userId: string, payload: ResetPasswordRequest) => void;
}) {
  const [form] = Form.useForm<ResetPasswordFormValues>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open, user?.id]);

  return (
    <Modal
      title={user ? `Reset password for ${user.fullName}?` : 'Reset password?'}
      open={open}
      width={560}
      okText="Reset password"
      okButtonProps={{ danger: true }}
      confirmLoading={submitting}
      cancelButtonProps={{ disabled: submitting }}
      maskClosable={!submitting}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Alert
        showIcon
        type="warning"
        message="This action immediately invalidates the user's current refresh session."
        style={{ marginBottom: 16 }}
      />
      <Form<ResetPasswordFormValues>
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={(values) => {
          if (user) onSubmit(user.id, { newPassword: values.newPassword });
        }}
      >
        <Form.Item
          name="newPassword"
          label="New password"
          rules={[
            { required: true, message: 'New password is required.' },
            { min: 8, max: 128 },
            {
              pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
              message: 'Password must contain at least one letter and one number.',
            },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirm new password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Confirm the new password.' },
            ({ getFieldValue }) => ({
              validator: async (_rule, value: string | undefined) => {
                if (!value || getFieldValue('newPassword') === value) return;
                throw new Error('Passwords do not match.');
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
