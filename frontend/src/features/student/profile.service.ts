import { api } from '@/lib/api';
import { getData, getPage, patchData, postData } from '@/lib/request';
import type {
  CareerGoal,
  Skill,
  Specialization,
  StudentProfile,
} from '@/types/domain';

export interface ProfilePayload {
  careerGoalId: string | null;
  specializationId: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

export interface SkillFormValues {
  skillId: string;
  description?: string;
}

export interface EvidenceUploadPayload {
  file?: File | null;
  evidenceUrl?: string | null;
  note?: string | null;
}

export const profileService = {
  getMyProfile() {
    return getData<StudentProfile>('/profiles/me');
  },
  updateMyProfile(payload: ProfilePayload) {
    return patchData<StudentProfile, ProfilePayload>('/profiles/me', payload);
  },
  listActiveCareerGoals() {
    return getPage<CareerGoal>('/career-goals', { limit: 100, status: 'ACTIVE' });
  },
  listCareerGoalSpecializations(careerGoalId: string) {
    return getPage<Specialization>(`/career-goals/${careerGoalId}/specializations`, {
      limit: 100,
    });
  },
  listActiveSkills() {
    return getPage<Skill>('/skills', { limit: 100, status: 'ACTIVE' });
  },
  listProfileResources<TResource>(endpoint: string) {
    return getPage<TResource>(endpoint, { limit: 50 });
  },
  createProfileResource<TResource, TPayload extends object>(endpoint: string, payload: TPayload) {
    return postData<TResource, TPayload>(endpoint, payload);
  },
  updateProfileResource<TResource, TPayload extends object>(
    endpoint: string,
    id: string,
    payload: TPayload,
  ) {
    return patchData<TResource, TPayload>(`${endpoint}/${id}`, payload);
  },
  async uploadProfileEvidence(endpoint: string, payload: EvidenceUploadPayload) {
    const formData = new FormData();
    if (payload.file) {
      formData.append('file', payload.file);
    }
    if (payload.evidenceUrl) {
      formData.append('evidenceUrl', payload.evidenceUrl);
    }
    if (payload.note) {
      formData.append('note', payload.note);
    }
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
