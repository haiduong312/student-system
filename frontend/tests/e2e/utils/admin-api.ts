import type { APIRequestContext, APIResponse, Page } from '@playwright/test';
import { getRoleCredentials, getTestEnvironment } from './test-env';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface ApiPage<T> {
  success: boolean;
  data: T[];
  meta: { total: number };
}

export interface ApiCatalogRecord {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ApiSkill extends ApiCatalogRecord {
  type: 'COMMON' | 'CAREER_SPECIFIC';
  categoryId?: string | null;
}

export interface ApiAssessmentOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface ApiAssessmentQuestion {
  id: string;
  questionText: string;
  status: 'ACTIVE' | 'INACTIVE';
  questionType: 'SINGLE_CHOICE' | 'TRUE_FALSE';
  level: number;
  skillId: string;
  options: ApiAssessmentOption[];
}

export interface ApiCareerRequiredSkill {
  id: string;
  careerGoalId: string;
  skillId: string;
  requiredLevel: number;
  skill?: ApiSkill;
}

export class AdminApiClient {
  private accessToken = '';
  private readonly apiBaseURL = getTestEnvironment().E2E_API_BASE_URL.replace(
    /\/$/,
    '',
  );

  private constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
  ) {}

  static async fromPage(page: Page) {
    const client = new AdminApiClient(page, page.request);
    await client.authenticate();
    await client.authorizeBrowserRequests();
    return client;
  }

  async createSkillCategory(name: string) {
    return this.post<ApiCatalogRecord>('/skill-categories', {
      name,
      description: `${name} test prerequisite`,
      status: 'ACTIVE',
    });
  }

  async createSkill(name: string, categoryId?: string) {
    return this.post<ApiSkill>('/skills', {
      name,
      categoryId,
      description: `${name} test prerequisite`,
      type: 'CAREER_SPECIFIC',
      defaultRequiredLevel: 1,
      defaultWeight: 1,
      status: 'ACTIVE',
    });
  }

  async createCareerGoal(name: string) {
    return this.post<ApiCatalogRecord>('/career-goals', {
      name,
      description: `${name} test prerequisite`,
      status: 'ACTIVE',
    });
  }

  async createCareerRequiredSkill(
    careerGoalId: string,
    skillId: string,
    requiredLevel = 1,
  ) {
    return this.post<ApiCareerRequiredSkill>(
      `/career-goals/${careerGoalId}/required-skills`,
      {
        skillId,
        requiredLevel,
        weight: 1,
        learningOrder: 1,
        isRequired: true,
        roadmapPhase: 'CAREER_TRACK',
      },
    );
  }

  async createAssessmentQuestion(
    skillId: string,
    questionText: string,
    level = 1,
  ) {
    return this.post<ApiAssessmentQuestion>('/assessment-questions', {
      skillId,
      questionText,
      questionType: 'SINGLE_CHOICE',
      level,
      explanation: `${questionText} E2E explanation`,
      status: 'ACTIVE',
      options: [
        { optionText: 'Correct E2E answer', isCorrect: true, orderIndex: 1 },
        { optionText: 'Incorrect E2E answer', isCorrect: false, orderIndex: 2 },
      ],
    });
  }

  async listCareerRequiredSkills(careerGoalId: string) {
    return this.getPage<ApiCareerRequiredSkill>(
      `/career-goals/${careerGoalId}/required-skills`,
      { limit: 100 },
    );
  }

  async updateCareerRequiredSkill(
    careerGoalId: string,
    requiredSkillId: string,
    payload: Record<string, unknown>,
  ) {
    return this.patch<ApiCareerRequiredSkill>(
      `/career-goals/${careerGoalId}/required-skills/${requiredSkillId}`,
      payload,
    );
  }

  async listSkills(params: Record<string, string | number> = {}) {
    return this.getPage<ApiSkill>('/skills', params);
  }

  async listQuestions(params: Record<string, string | number> = {}) {
    return this.getPage<ApiAssessmentQuestion>('/assessment-questions', params);
  }

  async findCatalogByName(path: string, name: string) {
    const records = await this.getPage<ApiCatalogRecord>(path, {
      search: name,
      limit: 100,
    });
    return records.find((record) => record.name === name);
  }

  async findQuestion(questionText: string, status?: 'ACTIVE' | 'INACTIVE') {
    const questions = await this.listQuestions({
      search: questionText,
      limit: 100,
      ...(status ? { status } : {}),
    });
    return questions.find((question) => question.questionText === questionText);
  }

  async deleteSkillCategory(id: string) {
    await this.delete(`/skill-categories/${id}`);
  }

  async deleteSkill(id: string) {
    await this.delete(`/skills/${id}`);
  }

  async deleteCareerGoal(id: string) {
    await this.delete(`/career-goals/${id}`);
  }

  async deactivateQuestion(id: string) {
    await this.delete(`/assessment-questions/${id}`);
  }

  async deleteCareerRequiredSkill(careerGoalId: string, id: string) {
    await this.delete(`/career-goals/${careerGoalId}/required-skills/${id}`);
  }

  async deactivateCareerGoal(id: string) {
    await this.patch<ApiCatalogRecord>(`/career-goals/${id}`, {
      status: 'INACTIVE',
    });
  }

  async deactivateSkill(id: string) {
    await this.patch<ApiSkill>(`/skills/${id}`, { status: 'INACTIVE' });
  }

  async deactivateSkillCategory(id: string) {
    await this.patch<ApiCatalogRecord>(`/skill-categories/${id}`, {
      status: 'INACTIVE',
    });
  }

  async cleanupCatalog({
    careerGoalNames = [],
    skillNames = [],
    categoryNames = [],
  }: {
    careerGoalNames?: string[];
    skillNames?: string[];
    categoryNames?: string[];
  }) {
    for (const name of careerGoalNames) {
      const record = await this.findCatalogByName('/career-goals', name);
      if (record) await this.deleteCareerGoal(record.id);
    }
    for (const name of skillNames) {
      const record = await this.findCatalogByName('/skills', name);
      if (record) await this.deleteSkill(record.id);
    }
    for (const name of categoryNames) {
      const record = await this.findCatalogByName('/skill-categories', name);
      if (record) await this.deleteSkillCategory(record.id);
    }
  }

  private async authenticate() {
    const credentials = getRoleCredentials('ADMIN');
    const response = await this.request.post(this.url('/auth/login'), {
      data: credentials,
    });
    const session = await this.parse<{ accessToken: string }>(
      response,
      'Admin API login',
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

  private async getPage<T>(
    path: string,
    params: Record<string, string | number>,
  ) {
    const response = await this.request.get(this.url(path), {
      headers: this.headers(),
      params,
    });
    const body = await this.parsePage<T>(response, `GET ${path}`);
    return body.data;
  }

  private async post<T>(path: string, data: unknown) {
    const response = await this.request.post(this.url(path), {
      headers: this.headers(),
      data,
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
    const body = (await response.json()) as ApiEnvelope<T>;
    return body.data;
  }

  private async parsePage<T>(response: APIResponse, operation: string) {
    if (!response.ok()) {
      throw new Error(
        `${operation} failed with ${response.status()}: ${await response.text()}`,
      );
    }
    return (await response.json()) as ApiPage<T>;
  }
}
