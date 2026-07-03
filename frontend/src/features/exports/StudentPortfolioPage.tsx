'use client';

import { FilePdfOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography } from 'antd';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExportHistoryTable } from './components/ExportHistoryTable';
import { useExportStudentPortfolioPdf } from './use-export-mutations';

export function StudentPortfolioPage() {
  const portfolioExport = useExportStudentPortfolioPdf();

  return (
    <>
      <PageHeader
        title="Portfolio của tôi"
        description="Tạo bản PDF từ dữ liệu hồ sơ năng lực hiện tại của bạn."
      />

      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card title="Xuất Portfolio PDF">
          <Typography.Paragraph>
            Portfolio tổng hợp hồ sơ cá nhân, kỹ năng và minh chứng; đồng thời bao gồm kết
            quả phân tích năng lực, khuyến nghị và lộ trình phát triển khi các dữ liệu này
            đã có trong hệ thống.
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary">
            File được tạo từ dữ liệu hiện tại tại thời điểm xuất và chỉ dành cho tài khoản
            sinh viên đang đăng nhập.
          </Typography.Paragraph>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={portfolioExport.isPending}
            disabled={portfolioExport.isPending}
            onClick={() => portfolioExport.mutate({})}
          >
            {portfolioExport.isPending ? 'Đang xuất...' : 'Xuất Portfolio PDF'}
          </Button>
        </Card>

        <ExportHistoryTable
          title="Lịch sử export Portfolio"
          initialPageSize={10}
          initialExportType="STUDENT_PORTFOLIO_PDF"
        />
      </Space>
    </>
  );
}
