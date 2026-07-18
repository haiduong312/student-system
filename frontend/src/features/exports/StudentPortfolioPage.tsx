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
        title="My Portfolio"
        description="Generate a PDF from your current competency profile."
      />

      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card title="Export Portfolio PDF">
          <Typography.Paragraph>
            The portfolio combines your profile, skills, and evidence. It also includes
            competency analysis results, suggested actions, and your development roadmap
            when available.
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary">
            The file is generated from your current data and is available only to the
            signed-in student account.
          </Typography.Paragraph>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={portfolioExport.isPending}
            disabled={portfolioExport.isPending}
            onClick={() => portfolioExport.mutate({})}
          >
            {portfolioExport.isPending ? 'Exporting...' : 'Export Portfolio PDF'}
          </Button>
        </Card>

        <ExportHistoryTable
          title="Portfolio Export History"
          initialPageSize={10}
          initialExportType="STUDENT_PORTFOLIO_PDF"
        />
      </Space>
    </>
  );
}
