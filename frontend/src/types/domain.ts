export type CatalogStatus = 'ACTIVE' | 'INACTIVE';
export type SkillType = 'COMMON' | 'CAREER_SPECIFIC';
export type RoadmapPhase =
  | 'CORE_FOUNDATION'
  | 'CAREER_TRACK'
  | 'SPECIALIZATION'
  | 'PRACTICE_PROJECT'
  | 'PORTFOLIO_PREPARATION';
export type QuestionType = 'SINGLE_CHOICE' | 'TRUE_FALSE';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';
export type EvidenceStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VerificationStatus =
  | 'NO_EVIDENCE'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED';
export type ProjectStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type RoadmapItemStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type RoadmapStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' | 'CANCELLED';
export type RoadmapItemType =
  | 'LEARN'
  | 'PRACTICE'
  | 'PROJECT'
  | 'CERTIFICATE'
  | 'PORTFOLIO';
export type StudentRecommendationStatus =
  | 'NEW'
  | 'SAVED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'DISMISSED'
  | 'OBSOLETE';

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
  type: SkillType;
  defaultRequiredLevel?: number | null;
  defaultWeight?: string | number | null;
  status: CatalogStatus;
  categoryId?: string | null;
  category?: SkillCategory | null;
  _count?: {
    assessmentQuestions?: number;
    careerRequiredSkills?: number;
    studentSkills?: number;
    recommendationTemplates?: number;
  };
}

export interface CareerGoal {
  id: string;
  name: string;
  description?: string | null;
  status: CatalogStatus;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    requiredSkills: number;
    studentProfiles: number;
    specializations?: number;
  };
}

export interface Specialization {
  id: string;
  careerGoalId: string;
  name: string;
  description?: string | null;
  status: CatalogStatus;
  createdAt?: string;
  updatedAt?: string;
  careerGoal?: CareerGoal;
  _count?: {
    requiredSkills?: number;
    studentProfiles?: number;
    roadmaps?: number;
  };
}

export interface CareerRequiredSkill {
  id: string;
  careerGoalId: string;
  specializationId?: string | null;
  skillId: string;
  requiredLevel: number;
  weight: string | number;
  learningOrder: number;
  isRequired: boolean;
  roadmapPhase?: RoadmapPhase;
  skill?: Skill;
  specialization?: Specialization | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssessmentOption {
  id: string;
  questionId?: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface AssessmentQuestion {
  id: string;
  skillId: string;
  questionText: string;
  questionType: QuestionType;
  level: number;
  explanation?: string | null;
  status: QuestionStatus;
  skill?: Skill;
  options?: AssessmentOption[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  careerGoal?: CareerGoal | null;
  careerGoalId?: string | null;
  specialization?: Specialization | null;
  specializationId?: string | null;
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
  skillId?: string | null;
  skillName?: string | null;
  recommendationId?: string | null;
  title: string;
  description?: string | null;
  itemType?: RoadmapItemType;
  roadmapPhase?: RoadmapPhase;
  orderIndex: number;
  weight: string | number;
  status: RoadmapItemStatus;
  deadline?: string | null;
  skill?: Skill | null;
}

export interface RoadmapPhaseGroup {
  phase: RoadmapPhase;
  items: RoadmapItem[];
}

export interface Roadmap {
  id?: string;
  roadmapId?: string;
  version?: number;
  title: string;
  description?: string | null;
  progressPercent: string | number;
  status: RoadmapStatus | string;
  careerGoal?: CareerGoal | string;
  specialization?: Specialization | string | null;
  items?: RoadmapItem[];
  phases?: RoadmapPhaseGroup[];
}

export interface CompetencyAnalysis {
  analysisResultId: string;
  careerGoal: string;
  specialization?: string | null;
  matchPercent: number;
  matchLevel: string;
  totalWeight: number;
  totalSkillScore: number;
  skills: Array<{
    skillId: string;
    skillName: string;
    categoryName?: string | null;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    weight: number;
    skillScore: number;
    priorityScore: number;
    status: string;
  }>;
  recommendations: Recommendation[];
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
}
