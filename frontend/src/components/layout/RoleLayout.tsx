'use client';

import { LogoutOutlined } from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { Grid } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { roleBasePath, roleLabels, roleMenu } from '@/components/layout/role-menu';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import type { UserRole } from '@/types/auth';

const { Header, Content, Sider } = Layout;

export function RoleLayout({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <ProtectedRoute allowedRoles={[role]}>
      <Layout className="app-page">
        <Sider
          width={260}
          collapsed={isMobile}
          theme="light"
          style={{ borderRight: '1px solid #edf0f5' }}
        >
          <div style={{ padding: 20 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Competency
            </Typography.Title>
            <Typography.Text type="secondary">{roleLabels[role]}</Typography.Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={roleMenu[role]}
            onClick={({ key }) => router.push(String(key))}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              alignItems: 'center',
              background: '#fff',
              borderBottom: '1px solid #edf0f5',
              display: 'flex',
              justifyContent: 'space-between',
              paddingInline: 24,
            }}
          >
            <Typography.Text strong>{roleBasePath[role].replace('/', '').toUpperCase()}</Typography.Text>
            <Space>
              <Avatar>{user?.fullName?.charAt(0) ?? role.charAt(0)}</Avatar>
              <Typography.Text>{user?.fullName}</Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={logout}>
                Logout
              </Button>
            </Space>
          </Header>
          <Content style={{ padding: isMobile ? 12 : 24 }}>{children}</Content>
        </Layout>
      </Layout>
    </ProtectedRoute>
  );
}
