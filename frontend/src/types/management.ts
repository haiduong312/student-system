import type { UserRole } from './auth';
import type {
  CareerGoal,
  Paginated,
  ProjectStatus,
  Skill,
  Specialization,
  VerificationStatus,
} from './domain';

export type ActiveStatus = 'ACTIVE' | 'INACTIVE';
export type UserStatus = ActiveStatus;
export type AssignmentStatus = ActiveStatus;
export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export type PaginationResponse<T> = Paginated<T>;

export interface UserReference {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface UserAccount extends UserReference {
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedStudentProfile {
  id: string;
  studentId: string;
  careerGoalId?: string | null;
  specializationId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  completionPercent: string | number;
  matchPercent: string | number;
  riskScore: number;
  lastAnalyzedAt?: string | null;
  lastUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  careerGoal?: CareerGoal | null;
  specialization?: Specialization | null;
  student?: StudentReference;
}

export interface Student {
  id: string;
  userId: string;
  studentCode: string;
  className?: string | null;
  major?: string | null;
  academicYear?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserAccount;
  profile?: ManagedStudentProfile | null;
}

export type StudentReference = Omit<Student, 'user' | 'profile'> & {
  user: UserReference;
};

export interface StudentProfileResourceQueryParams extends PaginationParams {
  verificationStatus?: VerificationStatus;
  projectStatus?: ProjectStatus;
  skillId?: string;
}

export interface StudentSkillResource {
  id: string;
  studentId: string;
  skillId: string;
  currentLevel: number;
  description?: string | null;
  evidenceStatus: VerificationStatus;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  skill: Skill;
}

export interface StudentProjectResource {
  id: string;
  studentId: string;
  title: string;
  description?: string | null;
  roleInProject?: string | null;
  technologies: string[];
  githubUrl?: string | null;
  demoUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectStatus;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCertificateResource {
  id: string;
  studentId: string;
  certificateName: string;
  issuer?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentActivityResource {
  id: string;
  studentId: string;
  title: string;
  organization?: string | null;
  role?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentExperienceResource {
  id: string;
  studentId: string;
  companyName: string;
  position: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Lecturer {
  id: string;
  userId: string;
  lecturerCode: string;
  department?: string | null;
  phone?: string | null;
  academicTitle?: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserAccount;
}

export type LecturerReference = Omit<Lecturer, 'user'> & {
  user: UserReference;
};

export interface AdvisorAssignment {
  id: string;
  lecturerId: string;
  studentId: string;
  assignedById?: string | null;
  assignedAt: string;
  status: AssignmentStatus;
  lecturer: LecturerReference;
  student: StudentReference;
  assignedBy?: UserReference | null;
}

export interface AdvisorReview {
  id: string;
  studentId: string;
  lecturerId: string;
  reviewContent: string;
  suggestion?: string | null;
  rating?: number | null;
  createdAt: string;
  updatedAt: string;
  student: StudentReference;
  lecturer: LecturerReference;
}

export interface UserStudentProfile {
  id: string;
  studentCode: string;
  className?: string | null;
  major?: string | null;
  academicYear?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  profile?: ManagedStudentProfile | null;
}

export interface UserLecturerProfile {
  id: string;
  lecturerCode: string;
  department?: string | null;
  phone?: string | null;
  academicTitle?: string | null;
}

export interface User extends UserAccount {
  student?: UserStudentProfile | null;
  lecturer?: UserLecturerProfile | null;
}

export interface StudentQueryParams extends PaginationParams {
  className?: string;
  major?: string;
  academicYear?: string;
  status?: UserStatus;
  isActive?: boolean;
}

export interface CreateStudentRequest {
  email: string;
  fullName: string;
  password: string;
  studentCode: string;
  className?: string | null;
  major?: string | null;
  academicYear?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  careerGoalId?: string | null;
  specializationId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

export type UpdateStudentRequest = Partial<Omit<CreateStudentRequest, 'password'>>;

export interface ImportStudentRecord {
  email: string;
  fullName: string;
  studentCode: string;
  password?: string;
  className?: string | null;
  major?: string | null;
  academicYear?: string | null;
  phone?: string | null;
}

export type ImportStudentsRequest =
  | ImportStudentRecord[]
  | { records: ImportStudentRecord[] };

export interface ImportStudentsResult {
  created: number;
  skipped: number;
  failed: number;
  data: Array<{
    row: number;
    email: string;
    studentCode: string;
    studentId: string;
    userId: string;
    temporaryPassword?: string;
  }>;
  errors: Array<{
    row: number;
    email?: string;
    studentCode?: string;
    reason: string;
  }>;
}

export interface LecturerQueryParams extends PaginationParams {
  department?: string;
  status?: UserStatus;
  isActive?: boolean;
}

export interface CreateLecturerRequest {
  email: string;
  fullName: string;
  password: string;
  lecturerCode: string;
  department?: string | null;
  phone?: string | null;
  academicTitle?: string | null;
}

export type UpdateLecturerRequest = Partial<Omit<CreateLecturerRequest, 'password'>>;

export interface AdvisorAssignmentQueryParams extends PaginationParams {
  lecturerId?: string;
  studentId?: string;
  status?: AssignmentStatus;
}

export interface CreateAdvisorAssignmentRequest {
  lecturerId: string;
  studentId: string;
  status?: AssignmentStatus;
}

export type UpdateAdvisorAssignmentRequest = Partial<CreateAdvisorAssignmentRequest>;

export interface AdvisorReviewQueryParams extends PaginationParams {
  studentId?: string;
  lecturerId?: string;
}

export interface CreateAdvisorReviewRequest {
  reviewContent: string;
  suggestion?: string | null;
  rating?: number | null;
}

export interface UserQueryParams extends PaginationParams {
  role?: UserRole;
  status?: UserStatus;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface DeactivateUserResult {
  deactivated: true;
  user: User;
}

export interface ReactivateUserResult {
  reactivated: true;
  user: User;
}

export interface ResetPasswordResult {
  passwordReset: true;
}

export interface DeleteResult {
  deleted: true;
}
