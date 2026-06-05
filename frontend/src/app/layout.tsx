import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import { AppProviders } from '@/components/layout/AppProviders';

export const metadata: Metadata = {
  title: 'Student Competency Profile',
  description: 'Student Digital Competency Profile and Personal Development Roadmap',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
