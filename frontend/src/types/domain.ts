export type CatalogStatus = 'ACTIVE' | 'INACTIVE';
export type SkillType = 'COMMON' | 'CAREER_SPECIFIC';
export const SKILL_TYPES = ['COMMON', 'CAREER_SPECIFIC'] as const satisfies readonly SkillType[];
export type SkillLevel = 'ZERO' | 'BASIC' | 'INTERMEDIATE' | 'GOOD';
export type RoadmapPhase =
  | 'CORE_FOUNDATION'
  | 'CAREER_TRACK'
  | 'SPECIALIZATION'
  | 'PRACTICE_PROJECT'
  | 'PORTFOLIO_PREPARATION';
export type QuestionType = 'SINGLE_CHOICE' | 'TRUE_FALSE';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';
export type AssessmentStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'CANCELLED';
export type EvidenceEntityType =
  | 'SKILL'
  | 'PROJECT'
  | 'CERTIFICATE'
  | 'ACTIVITY'
  | 'EXPERIENCE'
  | 'ROADMAP_ITEM';
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
export type MatchLevel = 'NOT_MATCHED' | 'DEVELOPING' | 'GOOD_MATCH' | 'STRONG_MATCH';
export type AnalysisResultStatus = 'CURRENT' | 'OBSOLETE';
export type AnalysisSkillStatus = 'ACHIEVED' | 'MISSING' | 'NEED_IMPROVEMENT';
export type RecommendationType =
  | 'COURSE'
  | 'PROJECT'
  | 'CERTIFICATE'
  | 'PRACTICE'
  | 'DOCUMENT'
  | 'PORTFOLIO_TASK';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type LearningResourceType =
  | 'COURSE'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'ARTICLE'
  | 'BOOK'
  | 'PRACTICE'
  | 'PROJECT'
  | 'CERTIFICATE'
  | 'TOOL';
export type ResourceProgressStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';
export type RoadmapItemType =
  | 'LEARN'
  | 'PRACTICE'
  | 'PROJECT'
  | 'CERTIFICATE'
  | 'PORTFOLIO';
export type NotificationType =
  | 'PROFILE_REMINDER'
  | 'EVIDENCE_VERIFIED'
  | 'EVIDENCE_REJECTED'
  | 'ROADMAP_REMINDER'
  | 'ADVISOR_REVIEW'
  | 'WEAK_PROFILE_ALERT'
  | 'SYSTEM';
export type StudentRecommendationStatus =
  | 'NEW'
  | 'SAVED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'DISMISSED'
  | 'OBSOLETE';

export const STUDENT_RECOMMENDATION_STATUSES = [
  'NEW',
  'SAVED',
  'IN_PROGRESS',
  'DONE',
  'DISMISSED',
  'OBSOLETE',
] as const satisfies readonly StudentRecommendationStatus[];

export const CURRENT_RECOMMENDATION_STATUSES = [
  'NEW',
  'SAVED',
  'IN_PROGRESS',
  'DONE',
] as const satisfies readonly StudentRecommendationStatus[];

export const ROADMAP_ACTIONABLE_RECOMMENDATION_STATUSES = [
  'NEW',
  'SAVED',
  'IN_PROGRESS',
] as const satisfies readonly StudentRecommendationStatus[];

export const RESOURCE_PROGRESS_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
] as const satisfies readonly ResourceProgressStatus[];

export const RESOURCE_PROGRESS_STATUS_TRANSITIONS: Record<
  ResourceProgressStatus,
  readonly ResourceProgressStatus[]
> = {
  NOT_STARTED: ['IN_PROGRESS', 'SKIPPED'],
  IN_PROGRESS: ['COMPLETED', 'SKIPPED'],
  COMPLETED: [],
  SKIPPED: ['IN_PROGRESS'],
};

export const RECOMMENDATION_STATUS_TRANSITIONS: Record<
  StudentRecommendationStatus,
  readonly StudentRecommendationStatus[]
> = {
  NEW: ['SAVED', 'DISMISSED'],
  SAVED: ['IN_PROGRESS', 'DISMISSED'],
  IN_PROGRESS: ['SAVED', 'DONE'],
  DONE: [],
  DISMISSED: [],
  OBSOLETE: [],
};

export const ROADMAP_ITEM_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const satisfies readonly RoadmapItemStatus[];

export const ROADMAP_ITEM_DONE_STATUS = 'DONE' as const satisfies RoadmapItemStatus;
export const ROADMAP_ITEM_IN_PROGRESS_STATUS = 'IN_PROGRESS' as const satisfies RoadmapItemStatus;
export const ROADMAP_ITEM_CANCELLED_STATUS = 'CANCELLED' as const satisfies RoadmapItemStatus;
export const ASSESSMENT_IN_PROGRESS_STATUS = 'IN_PROGRESS' as const satisfies AssessmentStatus;

export const ROADMAP_ITEM_STATUS_TRANSITIONS: Record<
  RoadmapItemStatus,
  readonly RoadmapItemStatus[]
> = {
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['TODO', 'DONE', 'CANCELLED'],
  DONE: ['IN_PROGRESS'],
  CANCELLED: [],
};

export const ROADMAP_CURRENT_STATUS = 'ACTIVE' as const satisfies RoadmapStatus;
export const ANALYSIS_CURRENT_STATUS = 'CURRENT' as const satisfies AnalysisResultStatus;
export const ANALYSIS_OBSOLETE_STATUS = 'OBSOLETE' as const satisfies AnalysisResultStatus;

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
  roadmapPhase?: RoadmapPhase | null;
  status: CatalogStatus;
  createdAt: string;
  updatedAt?: string;
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

export interface AssessmentAttemptPolicy {
  maxAttempts: number;
  cooldownMinutes: number;
  timeLimitMinutes: number;
}

export interface AssessmentCooldown {
  nextAllowedAt?: string;
  remainingSeconds?: number;
  remainingMinutes?: number;
  message?: string;
}

export interface AssessmentStartOption {
  id: string;
  optionText: string;
  orderIndex: number;
}

export interface AssessmentStartQuestion {
  id: string;
  skillId: string;
  skillName: string;
  skillType: SkillType;
  questionText: string;
  questionType: QuestionType;
  level: number;
  options: AssessmentStartOption[];
}

export interface AssessmentWarning {
  skillId: string;
  skillName: string;
  message: string;
}

export interface AssessmentStartResponse {
  assessmentId: string;
  careerGoalId: string;
  specializationId?: string | null;
  status?: Extract<AssessmentStatus, 'IN_PROGRESS'>;
  startedAt: string;
  expiresAt: string;
  attemptPolicy?: AssessmentAttemptPolicy;
  cooldown?: AssessmentCooldown;
  questions: AssessmentStartQuestion[];
  warnings: AssessmentWarning[];
}

export interface AssessmentAnswerInput {
  questionId: string;
  selectedOptionId: string;
}

export interface AssessmentLevelBreakdown {
  total: number;
  correct: number;
  percentage: number;
}

export interface AssessmentSkillResult {
  skillId: string;
  skillName: string;
  skillType: SkillType;
  calculatedLevel: number;
  totalQuestions: number;
  correctQuestions: number;
  levelBreakdown: Record<string, AssessmentLevelBreakdown>;
}

export interface AssessmentSubmitResponse {
  assessmentId: string;
  status: Extract<AssessmentStatus, 'GRADED'>;
  submittedAt?: string;
  skillResults: AssessmentSkillResult[];
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
  lastAnalyzedAt?: string | null;
  lastUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Evidence {
  id: string;
  studentId?: string;
  relatedEntityType: EvidenceEntityType;
  relatedEntityId: string;
  fileUrl?: string | null;
  evidenceUrl?: string | null;
  note?: string | null;
  status: EvidenceStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewerNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  student?: { studentCode: string; user?: { fullName: string; email: string } };
  reviewedBy?: { id: string; fullName: string; email: string; role: string } | null;
}

export interface LearningResourceSkillLink {
  id: string;
  resourceId: string;
  skillId: string;
  targetLevel?: SkillLevel | null;
  roadmapPhase?: RoadmapPhase | null;
  relevanceScore: number;
  orderIndex: number;
  skill?: Skill;
  createdAt: string;
  updatedAt: string;
}

export interface LearningResource {
  id: string;
  title: string;
  description?: string | null;
  resourceType: LearningResourceType;
  url?: string | null;
  provider?: string | null;
  difficultyLevel?: DifficultyLevel | null;
  estimatedDuration?: string | null;
  language?: string | null;
  isFree: boolean;
  status: CatalogStatus;
  skills?: LearningResourceSkillLink[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    templateLinks?: number;
    recommendationLinks?: number;
    progress?: number;
  };
}

export interface StudentResourceProgress {
  id: string;
  studentId: string;
  resourceId: string;
  recommendationId?: string | null;
  status: ResourceProgressStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  resource?: LearningResource;
  recommendation?: Recommendation | null;
}

export interface RecommendationResource {
  id: string;
  resourceId: string;
  orderIndex: number;
  resourceTitle: string;
  resourceDescription?: string | null;
  resourceType: LearningResourceType;
  resourceUrl?: string | null;
  provider?: string | null;
  estimatedDuration?: string | null;
  difficultyLevel?: DifficultyLevel | null;
  progressStatus: ResourceProgressStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recommendation {
  id: string;
  skillId?: string;
  title: string;
  description?: string | null;
  reason?: string | null;
  roadmapPhase?: RoadmapPhase | null;
  priorityScore: string | number;
  status: StudentRecommendationStatus;
  skill?: Skill;
  resources?: RecommendationResource[];
  isAllResourcesCompleted?: boolean;
}

export interface RoadmapItemResource {
  id: string;
  title: string;
  resourceType: LearningResourceType;
  url?: string | null;
  provider?: string | null;
  estimatedDuration?: string | null;
  difficultyLevel?: DifficultyLevel | null;
  progressStatus: ResourceProgressStatus;
  orderIndex: number;
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
  resources?: RoadmapItemResource[];
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
  status: RoadmapStatus;
  careerGoal?: CareerGoal | string;
  specialization?: Specialization | string | null;
  items?: RoadmapItem[];
  phases?: RoadmapPhaseGroup[];
}

export interface RoadmapHistoryItem {
  roadmapId: string;
  version: number;
  title: string;
  progressPercent: number;
  status: RoadmapStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisRecommendation {
  id: string;
  skillId: string;
  skillName: string;
  title: string;
  description?: string | null;
  type: RecommendationType;
  roadmapPhase: RoadmapPhase;
  priorityScore: number;
  source:
    | 'SPECIALIZATION_CAREER_SKILL_TEMPLATE'
    | 'CAREER_SKILL_TEMPLATE'
    | 'CATEGORY_SKILL_TEMPLATE'
    | 'SKILL_TEMPLATE'
    | 'DEFAULT_GENERATED';
}

export interface CompetencyAnalysis {
  analysisResultId: string;
  careerGoal: string;
  specialization?: string | null;
  matchPercent: number;
  matchLevel: MatchLevel;
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
    status: AnalysisSkillStatus;
    recommendation: AnalysisRecommendation | null;
  }>;
  recommendations: AnalysisRecommendation[];
}

export interface AnalysisResultSkillDetail {
  id?: string;
  skillId: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  weight: string | number;
  achievedScore: string | number;
  priorityScore: string | number;
  status: AnalysisSkillStatus;
  skill?: (Skill & { category?: SkillCategory | null }) | null;
}

export interface AnalysisResultDetail {
  id: string;
  studentId: string;
  careerGoalId: string;
  specializationId?: string | null;
  status: AnalysisResultStatus;
  completionPercent: string | number;
  matchPercent: string | number;
  riskScore: number;
  matchLevel: MatchLevel;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
  careerGoal?: CareerGoal | null;
  specialization?: Specialization | null;
  details: AnalysisResultSkillDetail[];
  recommendations: Recommendation[];
}

export interface AnalysisHistoryItem {
  id: string;
  studentId: string;
  careerGoalId: string;
  specializationId?: string | null;
  status: AnalysisResultStatus;
  completionPercent: string | number;
  matchPercent: string | number;
  riskScore: number;
  matchLevel: MatchLevel;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
  careerGoal?: CareerGoal | null;
  specialization?: Specialization | null;
}

export interface DashboardMissingSkill {
  skillId: string;
  skill?: Skill | null;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priorityScore: number;
  status: AnalysisSkillStatus;
}

export interface StudentDashboard {
  completionPercent: string | number;
  matchPercent: string | number;
  careerGoal?: CareerGoal | null;
  missingSkills: DashboardMissingSkill[];
  roadmapProgress: {
    roadmapId: string | null;
    progressPercent: number;
    status: RoadmapStatus | null;
    itemCount: number;
  };
}

export interface LecturerDashboard {
  studentCount: number;
  weakStudents: number;
  pendingEvidence: number;
}

export interface AdminDashboard {
  totalStudents: number;
  totalLecturers: number;
  topMissingSkills: Array<{
    skillId: string;
    skill?: Skill | null;
    missingCount: number;
  }>;
  topCareerGoals: Array<{
    careerGoalId: string | null;
    careerGoal?: CareerGoal | null;
    studentCount: number;
  }>;
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  notificationType: NotificationType;
  isRead: boolean;
  createdAt: string;
}
