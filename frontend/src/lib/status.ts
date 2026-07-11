import type {
  AnalysisResultStatus,
  AssessmentStatus,
  CatalogStatus,
  EvidenceStatus,
  ResourceProgressStatus,
  RoadmapItemStatus,
  RoadmapStatus,
  StudentRecommendationStatus,
  VerificationStatus,
} from '@/types/domain';
import {
  RECOMMENDATION_STATUS_TRANSITIONS,
  RESOURCE_PROGRESS_STATUS_TRANSITIONS,
  ROADMAP_ACTIONABLE_RECOMMENDATION_STATUSES,
  ROADMAP_CURRENT_STATUS,
  ROADMAP_ITEM_STATUS_TRANSITIONS,
} from '@/types/domain';

export type StatusBadgeValue =
  | AnalysisResultStatus
  | AssessmentStatus
  | CatalogStatus
  | EvidenceStatus
  | ResourceProgressStatus
  | RoadmapItemStatus
  | RoadmapStatus
  | StudentRecommendationStatus
  | VerificationStatus;

export function getAnalysisStatusLabel(status: AnalysisResultStatus) {
  return status;
}

export function getRecommendationStatusLabel(status: StudentRecommendationStatus) {
  return status;
}

export function getRoadmapStatusLabel(status: RoadmapStatus) {
  return status;
}

export function getRoadmapItemStatusLabel(status: RoadmapItemStatus) {
  return status;
}

export function getEvidenceStatusLabel(status: EvidenceStatus) {
  return status;
}

export function getResourceProgressStatusLabel(status: ResourceProgressStatus) {
  return status;
}

export function getStatusLabel(status: StatusBadgeValue) {
  return status;
}

export function getStatusColor(status: StatusBadgeValue) {
  switch (status) {
    case 'CURRENT':
    case 'ACTIVE':
    case 'GRADED':
    case 'VERIFIED':
    case 'DONE':
    case 'COMPLETED':
      return 'green';
    case 'NEW':
    case 'SAVED':
    case 'TODO':
    case 'NOT_STARTED':
    case 'SUBMITTED':
      return 'blue';
    case 'IN_PROGRESS':
    case 'PENDING':
      return 'processing';
    case 'NO_EVIDENCE':
    case 'INACTIVE':
    case 'DISMISSED':
    case 'SKIPPED':
    case 'ARCHIVED':
    case 'OBSOLETE':
      return 'default';
    case 'CANCELLED':
    case 'REJECTED':
      return 'red';
    default:
      return 'default';
  }
}

export function isActionableRecommendation(status: StudentRecommendationStatus) {
  return ROADMAP_ACTIONABLE_RECOMMENDATION_STATUSES.some(
    (actionableStatus) => actionableStatus === status,
  );
}

export function isActiveRoadmap(status?: RoadmapStatus | null) {
  return status === ROADMAP_CURRENT_STATUS;
}

export function canUpdateRecommendationStatus(
  current: StudentRecommendationStatus,
  next: StudentRecommendationStatus,
) {
  return RECOMMENDATION_STATUS_TRANSITIONS[current].some((status) => status === next);
}

export function canUpdateRoadmapItemStatus(
  current: RoadmapItemStatus,
  next: RoadmapItemStatus,
) {
  return ROADMAP_ITEM_STATUS_TRANSITIONS[current].some((status) => status === next);
}

export function canUpdateResourceProgressStatus(
  current: ResourceProgressStatus,
  next: ResourceProgressStatus,
) {
  return RESOURCE_PROGRESS_STATUS_TRANSITIONS[current].some((status) => status === next);
}

export function getRecommendationStatusOptions(status: StudentRecommendationStatus) {
  return Array.from(new Set([status, ...RECOMMENDATION_STATUS_TRANSITIONS[status]])).map(
    (value) => ({ value, label: getRecommendationStatusLabel(value) }),
  );
}

export function getRoadmapItemStatusOptions(status: RoadmapItemStatus) {
  return Array.from(new Set([status, ...ROADMAP_ITEM_STATUS_TRANSITIONS[status]])).map(
    (value) => ({ value, label: getRoadmapItemStatusLabel(value) }),
  );
}

export function getResourceProgressStatusOptions(status: ResourceProgressStatus) {
  return Array.from(new Set([status, ...RESOURCE_PROGRESS_STATUS_TRANSITIONS[status]])).map(
    (value) => ({ value, label: getResourceProgressStatusLabel(value) }),
  );
}
