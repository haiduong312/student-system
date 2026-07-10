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
            data-testid="login-error-alert"
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
                <Input {...field} autoComplete="email" data-testid="login-email-input" />
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
                <Input.Password
                  {...field}
                  autoComplete="current-password"
                  data-testid="login-password-input"
                />
              </Form.Item>
            )}
          />
          <Button
            block
            type="primary"
            htmlType="submit"
            loading={login.isPending}
            data-testid="login-submit-button"
          >
            Login
          </Button>
        </Form>
      </Card>
    </main>
  );
}
