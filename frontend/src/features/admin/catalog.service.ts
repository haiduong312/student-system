import { deleteData, getPage, patchData, postData } from '@/lib/request';
import type {
  CareerGoal,
  CareerRequiredSkill,
  CatalogStatus,
  Paginated,
  RoadmapPhase,
  Skill,
  SkillCategory,
  SkillType,
  Specialization,
} from '@/types/domain';

export type CatalogKind = 'skill-categories' | 'skills' | 'career-goals';
export type CatalogRecord = SkillCategory | Skill | CareerGoal;

export interface BaseCatalogPayload {
  name: string;
  description?: string | null;
  status?: CatalogStatus;
}

export interface SkillCategoryPayload extends BaseCatalogPayload {
  roadmapPhase?: RoadmapPhase | null;
}

export interface SkillPayload extends BaseCatalogPayload {
  categoryId?: string | null;
  type?: SkillType;
}

export type CareerGoalPayload = BaseCatalogPayload;
export type CatalogPayload = SkillCategoryPayload | SkillPayload | CareerGoalPayload;

export interface RequiredSkillPayload {
  skillId: string;
  requiredLevel: number;
  weight: number;
  learningOrder: number;
  roadmapPhase: RoadmapPhase;
  isRequired?: boolean;
}

export interface SpecializationPayload {
  careerGoalId?: string;
  name: string;
  description?: string | null;
  status: CatalogStatus;
}

export const adminCatalogService = {
  listCatalog<TRecord extends CatalogRecord>(
    kind: CatalogKind,
    params: { search?: string; page?: number; limit?: number } = {},
  ): Promise<Paginated<TRecord>> {
    return getPage<TRecord>(`/${kind}`, { limit: 10, ...params });
  },
  saveCatalog(kind: CatalogKind, payload: CatalogPayload, id?: string) {
    return id
      ? patchData<CatalogRecord, CatalogPayload>(`/${kind}/${id}`, payload)
      : postData<CatalogRecord, CatalogPayload>(`/${kind}`, payload);
  },
  deleteCatalog(kind: CatalogKind, id: string) {
    return deleteData<{ deleted: boolean }>(`/${kind}/${id}`);
  },
  listSkillCategories() {
    return getPage<SkillCategory>('/skill-categories', {
      limit: 100,
      status: 'ACTIVE',
    });
  },
  listSkills(params: Record<string, unknown> = {}) {
    return getPage<Skill>('/skills', { limit: 200, ...params });
  },
  listRequiredSkills(endpoint: string, limit = 100) {
    return getPage<CareerRequiredSkill>(endpoint, { limit });
  },
  saveRequiredSkill(endpoint: string, payload: RequiredSkillPayload, id?: string) {
    return id
      ? patchData<CareerRequiredSkill, RequiredSkillPayload>(`${endpoint}/${id}`, payload)
      : postData<CareerRequiredSkill, RequiredSkillPayload>(endpoint, payload);
  },
  deleteRequiredSkill(endpoint: string, id: string) {
    return deleteData<{ deleted: boolean }>(`${endpoint}/${id}`);
  },
  listSpecializations(endpoint: string) {
    return getPage<Specialization>(endpoint, { limit: 100 });
  },
  saveSpecialization(payload: SpecializationPayload, id?: string) {
    return id
      ? patchData<Specialization, SpecializationPayload>(`/admin/specializations/${id}`, payload)
      : postData<Specialization, SpecializationPayload>('/admin/specializations', payload);
  },
  deactivateSpecialization(id: string) {
    return deleteData<{ deactivated: boolean }>(`/admin/specializations/${id}`);
  },
};
