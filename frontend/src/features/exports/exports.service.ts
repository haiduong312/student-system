import { getPage, postData } from '@/lib/request';
import type {
  ExportCompetencyExcelPayload,
  ExportFileResponse,
  ExportHistoryItem,
  ExportHistoryQuery,
  ExportHistoryResponse,
  ExportLecturerStudentsExcelPayload,
  ExportPortfolioPdfPayload,
  ExportStudentsExcelPayload,
} from '@/types/exports';

export const exportsService = {
  exportStudentPortfolioPdf(payload: ExportPortfolioPdfPayload = {}) {
    return postData<ExportFileResponse, ExportPortfolioPdfPayload>(
      '/exports/portfolio',
      payload,
    );
  },

  exportStudentsExcel(payload: ExportStudentsExcelPayload = {}) {
    return postData<ExportFileResponse, ExportStudentsExcelPayload>(
      '/exports/reports/students',
      payload,
    );
  },

  exportCompetencyExcel(payload: ExportCompetencyExcelPayload = {}) {
    return postData<ExportFileResponse, ExportCompetencyExcelPayload>(
      '/exports/reports/competency',
      payload,
    );
  },

  exportLecturerStudentsExcel(
    payload: ExportLecturerStudentsExcelPayload = {},
  ) {
    return postData<ExportFileResponse, ExportLecturerStudentsExcelPayload>(
      '/exports/reports/lecturer-students',
      payload,
    );
  },

  getExportHistory(query: ExportHistoryQuery = {}): Promise<ExportHistoryResponse> {
    return getPage<ExportHistoryItem>('/exports/history', { ...query });
  },
};
