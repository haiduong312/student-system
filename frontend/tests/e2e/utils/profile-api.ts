import type { APIRequestContext, APIResponse, Page } from '@playwright/test';
import {
  getRoleCredentials,
  getTestEnvironment,
  type RoleCredentials,
  type TestRole,
} from './test-env';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface ApiPage<T> {
  success: boolean;
  data: T[];
  meta: { total: number };
}

export interface ApiStudentProfile {
  id: string;
  careerGoalId?: string | null;
  specializationId?: string | null;
  summary?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  careerGoal?: { id: string; name: string } | null;
  specialization?: { id: string; name: string } | null;
}

export interface ApiProfileResource {
  id: string;
  title?: string;
  certificateName?: string;
  companyName?: string;
  description?: string | null;
  verificationStatus?: string;
  evidenceStatus?: string;
  skill?: { id: string; name: string } | null;
}

export interface ApiEvidence {
  id: string;
  note?: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reviewerNote?: string | null;
  relatedEntityId: string;
  relatedEntityType: string;
}

export interface ApiAnalysis {
  analysisResultId: string;
  careerGoal: string;
  completionPercent: number;
  matchPercent: number;
  riskScore: number;
  matchLevel: string;
  skills: Array<{
    skillId: string;
    skillName: string;
    status: string;
    gap: number;
  }>;
  recommendations: Array<{ id: string; title: string; skillId: string }>;
}

export interface ApiAnalysisHistory {
  id: string;
  careerGoalId: string;
  status: 'CURRENT' | 'OBSOLETE';
  completionPercent: number | string;
  matchPercent: number | string;
  riskScore: number;
  matchLevel: string;
}

export interface ApiRecommendation {
  id: string;
  title: string;
  skillId: string;
  status: 'NEW' | 'SAVED' | 'IN_PROGRESS' | 'DONE' | 'DISMISSED' | 'OBSOLETE';
  roadmapPhase?: string | null;
}

export interface ApiRoadmapItem {
  id: string;
  title: string;
  orderIndex: number;
  roadmapPhase?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
}

export interface ApiRoadmap {
  id?: string;
  roadmapId?: string;
  title: string;
  progressPercent: number | string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';
  items?: ApiRoadmapItem[];
  phases?: Array<{ phase: string; items: ApiRoadmapItem[] }>;
}

export class ProfileApiClient {
  private accessToken = '';
  private readonly apiBaseURL = getTestEnvironment().E2E_API_BASE_URL.replace(
    /\/$/,
    '',
  );

  private constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
    private readonly role: TestRole,
    private readonly credentials: RoleCredentials,
  ) {}

  static async fromPage(page: Page, role: TestRole = 'STUDENT') {
    const client = new ProfileApiClient(
      page,
      page.request,
      role,
      getRoleCredentials(role),
    );
    await client.authenticate();
    await client.authorizeBrowserRequests();
    return client;
  }

  static async fromCredentials(
    page: Page,
    credentials: RoleCredentials,
    role: TestRole = 'STUDENT',
  ) {
    const client = new ProfileApiClient(page, page.request, role, credentials);
    await client.authenticate();
    await client.authorizeBrowserRequests();
    return client;
  }

  getMyProfile() {
    return this.get<ApiStudentProfile>('/profiles/me');
  }

  updateMyProfile(profile: Partial<ApiStudentProfile>) {
    return this.patch<ApiStudentProfile>('/profiles/me', profile);
  }

  createResource<T extends ApiProfileResource>(
    resource: string,
    payload: Record<string, unknown>,
  ) {
    return this.post<T>(`/profiles/me/${resource}`, payload);
  }

  updateResource<T extends ApiProfileResource>(
    resource: string,
    id: string,
    payload: Record<string, unknown>,
  ) {
    return this.patch<T>(`/profiles/me/${resource}/${id}`, payload);
  }

  listResources<T extends ApiProfileResource>(
    resource: string,
    params: Record<string, string | number> = {},
  ) {
    return this.getPage<T>(`/profiles/me/${resource}`, {
      limit: 100,
      ...params,
    });
  }

  async findResource(
    resource: string,
    name: string,
  ): Promise<ApiProfileResource | undefined> {
    const records = await this.listResources(resource, { search: name });
    return records.find((record) =>
      [record.title, record.certificateName, record.companyName, record.skill?.name]
        .filter(Boolean)
        .includes(name),
    );
  }

  async deleteResource(resource: string, id: string) {
    await this.delete(`/profiles/me/${resource}/${id}`);
  }

  uploadEvidence(
    resource: string,
    id: string,
    payload: { evidenceUrl?: string | null; note?: string | null },
  ) {
    return this.postMultipart<ApiEvidence>(
      `/profiles/me/${resource}/${id}/evidences`,
      payload,
    );
  }

  async findEvidence(
    note: string,
    status?: ApiEvidence['status'],
  ): Promise<ApiEvidence | undefined> {
    const endpoint = this.role === 'STUDENT' ? '/evidences/me' : '/evidences/pending';
    const records = await this.getPage<ApiEvidence>(endpoint, {
      search: note,
      limit: 100,
      ...(status && endpoint === '/evidences/me' ? { status } : {}),
    });
    return records.find(
      (evidence) => evidence.note === note && (!status || evidence.status === status),
    );
  }

  verifyEvidence(id: string, currentLevel?: number) {
    return this.patch<ApiEvidence>(
      `/evidences/${id}/verify`,
      currentLevel === undefined ? {} : { currentLevel },
    );
  }

  rejectEvidence(id: string, reviewerNote: string) {
    return this.patch<ApiEvidence>(`/evidences/${id}/reject`, { reviewerNote });
  }

  analyzeMine() {
    return this.post<ApiAnalysis>('/competency/analyze/me', {});
  }

  listAnalysisHistory() {
    return this.getPage<ApiAnalysisHistory>('/competency/analysis-history/me', {
      limit: 20,
      sortOrder: 'desc',
    });
  }

  listRecommendations(status?: ApiRecommendation['status']) {
    return this.getPage<ApiRecommendation>('/recommendations/me', {
      limit: 100,
      ...(status ? { status } : {}),
    });
  }

  updateRecommendationStatus(id: string, status: ApiRecommendation['status']) {
    return this.patch<ApiRecommendation>(`/recommendations/${id}/status`, {
      status,
    });
  }

  getActiveRoadmap() {
    return this.get<ApiRoadmap | null>('/roadmaps/me');
  }

  generateRoadmap() {
    return this.post<ApiRoadmap>('/roadmaps/generate/me', {
      archiveCurrentActiveRoadmap: true,
    });
  }

  getRoadmapHistory() {
    return this.get<ApiRoadmap[]>('/roadmaps/history/me');
  }

  createAdvisorReview(
    studentId: string,
    payload: {
      reviewContent: string;
      suggestion?: string | null;
      rating?: number | null;
    },
  ) {
    return this.post(`/advisor-reviews/students/${studentId}`, payload);
  }

  async getStatus(path: string) {
    const response = await this.request.get(this.url(path), {
      headers: this.headers(),
    });
    return {
      status: response.status(),
      body: await response.text(),
    };
  }

  async postStatus(path: string, data: unknown) {
    const response = await this.request.post(this.url(path), {
      headers: this.headers(),
      data,
    });
    return {
      status: response.status(),
      body: await response.text(),
    };
  }

  async submitAssessmentRaw(
    assessmentId: string,
    answers: Array<{ questionId: string; selectedOptionId: string }>,
  ) {
    const response = await this.request.post(
      this.url(`/assessments/${assessmentId}/submit`),
      { headers: this.headers(), data: { answers } },
    );
    return {
      status: response.status(),
      body: (await response.json()) as Record<string, unknown>,
    };
  }

  private async authenticate() {
    const response = await this.request.post(this.url('/auth/login'), {
      data: this.credentials,
    });
    const session = await this.parse<{ accessToken: string }>(
      response,
      `${this.role} API login`,
    );
    this.accessToken = session.accessToken;
  }

  private async authorizeBrowserRequests() {
    await this.page.route('**/api/**', async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          authorization: `Bearer ${this.accessToken}`,
        },
      });
    });
  }

  private async get<T>(path: string) {
    const response = await this.request.get(this.url(path), {
      headers: this.headers(),
    });
    return this.parse<T>(response, `GET ${path}`);
  }

  private async getPage<T>(
    path: string,
    params: Record<string, string | number>,
  ) {
    const response = await this.request.get(this.url(path), {
      headers: this.headers(),
      params,
    });
    if (!response.ok()) {
      throw new Error(
        `GET ${path} failed with ${response.status()}: ${await response.text()}`,
      );
    }
    return ((await response.json()) as ApiPage<T>).data;
  }

  private async post<T>(path: string, data: unknown) {
    const response = await this.request.post(this.url(path), {
      headers: this.headers(),
      data,
    });
    return this.parse<T>(response, `POST ${path}`);
  }

  private async postMultipart<T>(
    path: string,
    data: Record<string, string | null | undefined>,
  ) {
    const multipart = Object.fromEntries(
      Object.entries(data).flatMap(([key, value]) =>
        value === undefined || value === null ? [] : [[key, value]],
      ),
    );
    const response = await this.request.post(this.url(path), {
      headers: this.headers(),
      multipart,
    });
    return this.parse<T>(response, `POST ${path}`);
  }

  private async patch<T>(path: string, data: unknown) {
    const response = await this.request.patch(this.url(path), {
      headers: this.headers(),
      data,
    });
    return this.parse<T>(response, `PATCH ${path}`);
  }

  private async delete(path: string) {
    const response = await this.request.delete(this.url(path), {
      headers: this.headers(),
    });
    await this.parse<unknown>(response, `DELETE ${path}`);
  }

  private headers() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  private url(path: string) {
    return `${this.apiBaseURL}${path}`;
  }

  private async parse<T>(response: APIResponse, operation: string) {
    if (!response.ok()) {
      throw new Error(
        `${operation} failed with ${response.status()}: ${await response.text()}`,
      );
    }
    return ((await response.json()) as ApiEnvelope<T>).data;
  }
}
