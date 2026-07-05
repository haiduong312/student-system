import {
  AdminApiClient,
  type ApiCareerRequiredSkill,
  type ApiCatalogRecord,
  type ApiSkill,
} from './admin-api';
import {
  ProfileApiClient,
  type ApiProfileResource,
  type ApiStudentProfile,
} from './profile-api';
import { uniqueE2EName } from './test-data';

export interface WorkflowSkillContext {
  skill: ApiSkill;
  studentSkill: ApiProfileResource;
  requiredSkill: ApiCareerRequiredSkill;
  recommendationTitle: string;
}

export interface WorkflowContext {
  marker: string;
  originalProfile: ApiStudentProfile;
  category: ApiCatalogRecord;
  careerGoal: ApiCatalogRecord;
  skills: WorkflowSkillContext[];
  cleanupRequiredSkills: ApiCareerRequiredSkill[];
}

export async function createWorkflowContext(
  adminApi: AdminApiClient,
  studentApi: ProfileApiClient,
  skillCount = 1,
): Promise<WorkflowContext> {
  const marker = uniqueE2EName('Workflow');
  const originalProfile = await studentApi.getMyProfile();
  const category = await adminApi.createSkillCategory(`${marker}-Category`);
  const createdSkills: ApiSkill[] = [];
  for (let index = 1; index <= skillCount; index += 1) {
    createdSkills.push(
      await adminApi.createSkill(`${marker}-Skill-${index}`, category.id),
    );
  }

  const careerGoal = await adminApi.createCareerGoal(`${marker}-Career`);
  const commonRequiredSkills = await adminApi.listCareerRequiredSkills(
    careerGoal.id,
  );
  for (const requiredSkill of commonRequiredSkills) {
    await adminApi.updateCareerRequiredSkill(
      careerGoal.id,
      requiredSkill.id,
      { isRequired: false },
    );
  }

  const skills: WorkflowSkillContext[] = [];
  for (const [index, skill] of createdSkills.entries()) {
    const requiredSkill = await adminApi.createCareerRequiredSkill(
      careerGoal.id,
      skill.id,
      2,
    );
    const studentSkill = await studentApi.createResource<ApiProfileResource>(
      'skills',
      {
        skillId: skill.id,
        description: `${marker} analysis input ${index + 1}`,
      },
    );
    skills.push({
      skill,
      studentSkill,
      requiredSkill,
      recommendationTitle: `Improve ${skill.name}`,
    });
  }

  await studentApi.updateMyProfile({
    careerGoalId: careerGoal.id,
    specializationId: null,
  });

  return {
    marker,
    originalProfile,
    category,
    careerGoal,
    skills,
    cleanupRequiredSkills: [
      ...commonRequiredSkills,
      ...skills.map((skill) => skill.requiredSkill),
    ],
  };
}

export async function cleanupWorkflowContext(
  adminApi: AdminApiClient,
  studentApi: ProfileApiClient,
  context: WorkflowContext,
) {
  const original = context.originalProfile;
  await studentApi.updateMyProfile({
    careerGoalId: original.careerGoalId ?? null,
    specializationId: original.specializationId ?? null,
    summary: original.summary ?? null,
    githubUrl: original.githubUrl ?? null,
    linkedinUrl: original.linkedinUrl ?? null,
    portfolioUrl: original.portfolioUrl ?? null,
  });

  for (const workflowSkill of context.skills) {
    await studentApi.deleteResource('skills', workflowSkill.studentSkill.id);
  }
  for (const requiredSkill of context.cleanupRequiredSkills) {
    await adminApi.deleteCareerRequiredSkill(
      context.careerGoal.id,
      requiredSkill.id,
    );
  }
  await adminApi.deactivateCareerGoal(context.careerGoal.id);
  for (const workflowSkill of context.skills) {
    await adminApi.deactivateSkill(workflowSkill.skill.id);
  }
  await adminApi.deactivateSkillCategory(context.category.id);
}
