'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schema';
import { useLogin } from '@/hooks/useAuth';

export default function LoginPage() {
  const login = useLogin();
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <main
      style={{
        alignItems: 'center',
        display: 'flex',
        minHeight: '100vh',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: 420, width: '100%' }}>
        <Typography.Title level={3}>Student Competency Profile</Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in with your university account.
        </Typography.Paragraph>
        {login.isError ? (
          <Alert
            message="Login failed"
            description="Please check your email and password."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form layout="vertical" onFinish={handleSubmit((values) => login.mutate(values))}>
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Email"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} autoComplete="email" />
              </Form.Item>
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Password"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input.Password {...field} autoComplete="current-password" />
              </Form.Item>
            )}
          />
          <Button block type="primary" htmlType="submit" loading={login.isPending}>
            Login
          </Button>
        </Form>
      </Card>
    </main>
  );
}
