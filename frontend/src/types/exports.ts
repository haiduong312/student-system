import type { AnalysisResultStatus, Paginated } from './domain';
import type {
  AssignmentStatus,
  PaginationParams,
  UserStatus,
} from './management';

export const EXPORT_TYPES = [
  'STUDENT_PORTFOLIO_PDF',
  'STUDENTS_EXCEL',
  'COMPETENCY_EXCEL',
  'LECTURER_STUDENTS_EXCEL',
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export interface ExportFileResponse {
  fileUrl: string;
  exportType: ExportType;
  createdAt?: string;
}

export interface ExportHistoryItem {
  id: string;
  exportType: ExportType;
  fileUrl: string | null;
  createdAt: string;
  userId?: string | null;
}

export interface ExportHistoryQuery {
  exportType?: ExportType;
  page?: number;
  current?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}

export type ExportHistoryResponse = Paginated<ExportHistoryItem>;

export interface ExportStudentsExcelPayload extends PaginationParams {
  className?: string;
  major?: string;
  academicYear?: string;
  status?: UserStatus;
  isActive?: boolean;
}

export interface ExportCompetencyExcelPayload {
  studentId?: string;
  careerGoalId?: string;
  specializationId?: string;
  status?: AnalysisResultStatus;
  fromDate?: string;
  toDate?: string;
}

export interface ExportLecturerStudentsExcelPayload extends PaginationParams {
  lecturerId?: string;
  studentId?: string;
  status?: AssignmentStatus;
}

export type PortfolioSection =
  | 'profile'
  | 'skills'
  | 'evidences'
  | 'analysis'
  | 'recommendations'
  | 'roadmap';

export type PortfolioPrivacyField =
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'externalLinks'
  | 'evidenceLinks';

export interface ExportPortfolioPdfPayload {
  studentId?: string;
  sections?: PortfolioSection[];
  privacy?: Partial<Record<PortfolioPrivacyField, boolean>>;
}
