import { deleteData, getData, getPage, patchData, postData } from '@/lib/request';
import type {
  CatalogStatus,
  DifficultyLevel,
  LearningResource,
  LearningResourceSkillLink,
  LearningResourceType,
  Paginated,
  RoadmapPhase,
  Skill,
  SkillLevel,
} from '@/types/domain';

export interface LearningResourcePayload {
  title: string;
  description?: string | null;
  resourceType: LearningResourceType;
  url?: string | null;
  provider?: string | null;
  difficultyLevel?: DifficultyLevel | null;
  estimatedDuration?: string | null;
  language?: string | null;
  isFree?: boolean;
  status?: CatalogStatus;
}

export interface LearningResourceFilters {
  search?: string;
  page?: number;
  limit?: number;
  status?: CatalogStatus;
  resourceType?: LearningResourceType;
  difficultyLevel?: DifficultyLevel;
  skillId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LinkResourceSkillPayload {
  skillId: string;
  targetLevel?: SkillLevel | null;
  roadmapPhase?: RoadmapPhase | null;
  relevanceScore?: number;
  orderIndex?: number;
}

export interface UpdateResourceSkillPayload
  extends Omit<LinkResourceSkillPayload, 'skillId'> {
  currentTargetLevel?: SkillLevel | null;
}

export const learningResourceService = {
  list(filters: LearningResourceFilters = {}): Promise<Paginated<LearningResource>> {
    return getPage<LearningResource>('/learning-resources', {
      limit: 10,
      ...filters,
    });
  },
  get(id: string) {
    return getData<LearningResource>(`/learning-resources/${id}`);
  },
  save(payload: LearningResourcePayload, id?: string) {
    return id
      ? patchData<LearningResource, LearningResourcePayload>(
          `/learning-resources/${id}`,
          payload,
        )
      : postData<LearningResource, LearningResourcePayload>(
          '/learning-resources',
          payload,
        );
  },
  deactivate(id: string) {
    return deleteData<{ deactivated: boolean; resource: LearningResource }>(
      `/learning-resources/${id}`,
    );
  },
  listSkills() {
    return getPage<Skill>('/skills', { limit: 100, status: 'ACTIVE' });
  },
  linkSkill(resourceId: string, payload: LinkResourceSkillPayload) {
    return postData<LearningResourceSkillLink, LinkResourceSkillPayload>(
      `/learning-resources/${resourceId}/skills`,
      payload,
    );
  },
  updateSkill(
    resourceId: string,
    skillId: string,
    payload: UpdateResourceSkillPayload,
  ) {
    return patchData<LearningResourceSkillLink, UpdateResourceSkillPayload>(
      `/learning-resources/${resourceId}/skills/${skillId}`,
      payload,
    );
  },
  unlinkSkill(resourceId: string, skillId: string) {
    return deleteData<{ unlinked: boolean; deletedLinks: number }>(
      `/learning-resources/${resourceId}/skills/${skillId}`,
    );
  },
};
