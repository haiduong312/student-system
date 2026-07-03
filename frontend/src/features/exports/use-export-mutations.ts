'use client';

import { App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadPrivateFile } from '@/lib/private-files';
import type {
  ExportCompetencyExcelPayload,
  ExportFileResponse,
  ExportLecturerStudentsExcelPayload,
  ExportPortfolioPdfPayload,
  ExportStudentsExcelPayload,
} from '@/types/exports';
import { exportsService } from './exports.service';

export const exportHistoryQueryKey = ['exports', 'history'] as const;

type ExportRequest<TPayload> = (
  payload: TPayload,
) => Promise<ExportFileResponse>;

class ExportDownloadError extends Error {
  constructor() {
    super('Export file download failed');
    this.name = 'ExportDownloadError';
  }
}

function useExportAndDownload<TPayload>(exportRequest: ExportRequest<TPayload>) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation<ExportFileResponse, unknown, TPayload>({
    mutationFn: async (payload) => {
      const result = await exportRequest(payload);

      void queryClient.invalidateQueries({ queryKey: exportHistoryQueryKey });
      try {
        await downloadPrivateFile(result.fileUrl);
      } catch {
        throw new ExportDownloadError();
      }

      return result;
    },
    onSuccess: () => message.success('Xuất file thành công.'),
    onError: (error) => message.error(getExportErrorMessage(error)),
  });
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof ExportDownloadError) {
    return 'Tạo file thành công nhưng tải file thất bại.';
  }
  if (getResponseStatus(error) === 403) {
    return 'Bạn không có quyền thực hiện export này.';
  }
  if (getResponseStatus(error) === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  return 'Xuất file thất bại, vui lòng thử lại.';
}

function getResponseStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }

  const response = error.response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return undefined;
  }

  return typeof response.status === 'number' ? response.status : undefined;
}

export function useExportStudentPortfolioPdf() {
  return useExportAndDownload<ExportPortfolioPdfPayload>(
    exportsService.exportStudentPortfolioPdf,
  );
}

export function useExportStudentsExcel() {
  return useExportAndDownload<ExportStudentsExcelPayload>(
    exportsService.exportStudentsExcel,
  );
}

export function useExportCompetencyExcel() {
  return useExportAndDownload<ExportCompetencyExcelPayload>(
    exportsService.exportCompetencyExcel,
  );
}

export function useExportLecturerStudentsExcel() {
  return useExportAndDownload<ExportLecturerStudentsExcelPayload>(
    exportsService.exportLecturerStudentsExcel,
  );
}
