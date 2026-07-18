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
    onSuccess: () => message.success('File exported successfully.'),
    onError: (error) => message.error(getExportErrorMessage(error)),
  });
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof ExportDownloadError) {
    return 'The file was created, but the download failed.';
  }
  if (getResponseStatus(error) === 403) {
    return 'You do not have permission to perform this export.';
  }
  if (getResponseStatus(error) === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  return 'Export failed. Please try again.';
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
