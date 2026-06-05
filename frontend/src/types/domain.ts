export type CatalogStatus = 'ACTIVE' | 'INACTIVE';
export type EvidenceStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VerificationStatus = 'NO_EVIDENCE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RoadmapItemStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type StudentRecommendationStatus = 'NEW' | 'SAVED' | 'IN_PROGRESS' | 'DONE' | 'DISMISSED';

export interface Paginated<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface SkillCategory {
  id: string;
  name: string;
  description?: string | null;
  status: CatalogStatus;
  createdAt: string;
  _count?: { skills: number };
}

export interface Skill {
  id: string;
  name: string;
  description?: string | null;
  status: CatalogStatus;
  categoryId?: string | null;
  category?: SkillCategory | null;
}

export interface CareerGoal {
  id: string;
  name: string;
  description?: string | null;
  status: CatalogStatus;
}

export interface StudentProfile {
  id: string;
  careerGoal?: CareerGoal | null;
  careerGoalId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  completionPercent: string | number;
  matchPercent: string | number;
  riskScore: number;
}

export interface Evidence {
  id: string;
  relatedEntityType: string;
  relatedEntityId: string;
  fileUrl?: string | null;
  evidenceUrl?: string | null;
  note?: string | null;
  status: EvidenceStatus;
  reviewerNote?: string | null;
  createdAt: string;
  student?: { studentCode: string; user?: { fullName: string; email: string } };
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string | null;
  reason?: string | null;
  priorityScore: string | number;
  status: StudentRecommendationStatus;
  skill?: Skill;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  weight: string | number;
  status: RoadmapItemStatus;
  skill?: Skill | null;
}

export interface Roadmap {
  id: string;
  title: string;
  description?: string | null;
  progressPercent: string | number;
  status: string;
  careerGoal?: CareerGoal;
  items?: RoadmapItem[];
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
}
