import { deleteData, getData, getPage, patchData, postData } from '@/lib/request';
import type {
  CareerGoal,
  CatalogStatus,
  DifficultyLevel,
  LearningResource,
  LearningResourceType,
  Paginated,
  RecommendationTemplate,
  RecommendationTemplateResourceLink,
  RecommendationType,
  RoadmapPhase,
  Skill,
  SkillCategory,
  SkillLevel,
  Specialization,
  TemplateStatus,
} from '@/types/domain';

export interface RecommendationTemplatePayload {
  skillId?: string | null;
  skillCategoryId?: string | null;
  careerGoalId?: string | null;
  specializationId?: string | null;
  level?: SkillLevel | null;
  recommendationType: RecommendationType;
  title: string;
  description?: string | null;
  difficultyLevel?: DifficultyLevel | null;
  estimatedDuration?: string | null;
  resourceUrl?: string | null;
  priority?: number;
  roadmapPhase?: RoadmapPhase | null;
  status?: TemplateStatus;
}

export interface RecommendationTemplateFilters {
  search?: string;
  page?: number;
  limit?: number;
  skillId?: string;
  skillCategoryId?: string;
  careerGoalId?: string;
  specializationId?: string;
  level?: SkillLevel;
  recommendationType?: RecommendationType;
  roadmapPhase?: RoadmapPhase;
  status?: TemplateStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LinkRecommendationTemplateResourcePayload {
  resourceId: string;
  orderIndex?: number;
  priority?: number;
}

export interface LearningResourceFilters {
  search?: string;
  page?: number;
  limit?: number;
  status?: CatalogStatus;
  resourceType?: LearningResourceType;
  difficultyLevel?: DifficultyLevel;
  skillId?: string;
}

export const recommendationTemplateService = {
  listTemplates(
    filters: RecommendationTemplateFilters = {},
  ): Promise<Paginated<RecommendationTemplate>> {
    return getPage<RecommendationTemplate>('/recommendation-templates', {
      limit: 10,
      ...filters,
    });
  },
  getTemplate(id: string) {
    return getData<RecommendationTemplate>(`/recommendation-templates/${id}`);
  },
  saveTemplate(payload: RecommendationTemplatePayload, id?: string) {
    return id
      ? patchData<RecommendationTemplate, RecommendationTemplatePayload>(
          `/recommendation-templates/${id}`,
          payload,
        )
      : postData<RecommendationTemplate, RecommendationTemplatePayload>(
          '/recommendation-templates',
          payload,
        );
  },
  deactivateTemplate(id: string) {
    return deleteData<{ deactivated: boolean; template: RecommendationTemplate }>(
      `/recommendation-templates/${id}`,
    );
  },
  listTemplateResources(id: string) {
    return getData<RecommendationTemplateResourceLink[]>(
      `/recommendation-templates/${id}/resources`,
    );
  },
  linkResource(id: string, payload: LinkRecommendationTemplateResourcePayload) {
    return postData<
      RecommendationTemplateResourceLink,
      LinkRecommendationTemplateResourcePayload
    >(`/recommendation-templates/${id}/resources`, payload);
  },
  unlinkResource(id: string, resourceId: string) {
    return deleteData<{ unlinked: boolean; deletedLinks: number }>(
      `/recommendation-templates/${id}/resources/${resourceId}`,
    );
  },
  listSkillCategories() {
    return getPage<SkillCategory>('/skill-categories', {
      limit: 100,
      status: 'ACTIVE',
    });
  },
  listSkills() {
    return getPage<Skill>('/skills', { limit: 100, status: 'ACTIVE' });
  },
  listCareerGoals() {
    return getPage<CareerGoal>('/career-goals', {
      limit: 100,
      status: 'ACTIVE',
    });
  },
  listSpecializations(params: { careerGoalId?: string; status?: CatalogStatus } = {}) {
    return getPage<Specialization>('/admin/specializations', {
      limit: 100,
      status: 'ACTIVE',
      ...params,
    });
  },
  listLearningResources(filters: LearningResourceFilters = {}) {
    return getPage<LearningResource>('/learning-resources', {
      limit: 100,
      status: 'ACTIVE',
      ...filters,
    });
  },
};
