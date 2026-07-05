import { expect, test } from '../fixtures';
import {
  StudentDashboardPage,
  StudentProfilePage,
  StudentResourcePage,
  type StudentResourceKind,
} from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { ProfileApiClient } from '../utils/profile-api';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Student competency profile', () => {
  test('shows the student dashboard metrics', async ({ studentPage }) => {
    const dashboard = new StudentDashboardPage(studentPage);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('updates profile links and summary while preserving career context', async ({
    studentPage,
  }) => {
    const api = await ProfileApiClient.fromPage(studentPage);
    const original = await api.getMyProfile();
    const marker = uniqueE2EName('Profile');
    const values = {
      careerGoal: original.careerGoal?.name,
      specialization: original.specialization?.name,
      summary: `${marker} competency summary`,
      githubURL: `https://github.com/e2e/${marker.toLowerCase()}`,
      linkedinURL: `https://www.linkedin.com/in/${marker.toLowerCase()}`,
      portfolioURL: `https://${marker.toLowerCase()}.example.com`,
    };
    const profile = new StudentProfilePage(studentPage);

    try {
      await profile.goto();
      await profile.expectLoaded();
      await profile.fillForm(values);
      await profile.save();
      await profile.expectValues(values);

      const updated = await api.getMyProfile();
      expect(updated.careerGoalId).toBe(original.careerGoalId);
      expect(updated.specializationId).toBe(original.specializationId);
      expect(updated.summary).toBe(values.summary);
      expect(updated.githubUrl).toBe(values.githubURL);
    } finally {
      await api.updateMyProfile({
        careerGoalId: original.careerGoalId ?? null,
        specializationId: original.specializationId ?? null,
        summary: original.summary ?? null,
        githubUrl: original.githubUrl ?? null,
        linkedinUrl: original.linkedinUrl ?? null,
        portfolioUrl: original.portfolioUrl ?? null,
      });
    }
  });

  test('adds and edits a personal skill', async ({ studentPage, adminPage }) => {
    const studentApi = await ProfileApiClient.fromPage(studentPage);
    const adminApi = await AdminApiClient.fromPage(adminPage);
    const categoryName = uniqueE2EName('StudentSkillCategory');
    const skillName = uniqueE2EName('StudentSkill');
    const category = await adminApi.createSkillCategory(categoryName);
    await adminApi.createSkill(skillName, category.id);
    const skills = new StudentResourcePage(studentPage, 'skills');

    try {
      await skills.goto();
      await skills.expectLoaded();
      await skills.add({
        selects: { Skill: skillName },
        fields: { Description: 'E2E initial skill description' },
      });
      await skills.expectResource(skillName);

      await skills.edit(skillName, {
        Description: 'E2E updated skill description',
      });
      const updated = await studentApi.findResource('skills', skillName);
      expect(updated?.description).toBe('E2E updated skill description');
    } finally {
      const record = await studentApi.findResource('skills', skillName);
      if (record) await studentApi.deleteResource('skills', record.id);
      await adminApi.cleanupCatalog({
        skillNames: [skillName],
        categoryNames: [categoryName],
      });
    }
  });

  for (const scenario of getResourceScenarios()) {
    test(`adds and edits ${withArticle(scenario.label)}`, async ({
      studentPage,
    }) => {
      const api = await ProfileApiClient.fromPage(studentPage);
      const initialName = uniqueE2EName(scenario.label);
      const updatedName = `${initialName}-Updated`;
      const resourcePage = new StudentResourcePage(studentPage, scenario.kind);

      try {
        await resourcePage.goto();
        await resourcePage.expectLoaded();
        await resourcePage.add({ fields: scenario.create(initialName) });
        await resourcePage.expectResource(initialName);

        await resourcePage.edit(initialName, scenario.update(updatedName));
        await resourcePage.expectResource(updatedName);
        expect(await api.findResource(scenario.kind, updatedName)).toBeDefined();
      } finally {
        const record =
          (await api.findResource(scenario.kind, updatedName)) ??
          (await api.findResource(scenario.kind, initialName));
        if (record) await api.deleteResource(scenario.kind, record.id);
      }
    });
  }
});

interface ResourceScenario {
  kind: Exclude<StudentResourceKind, 'skills'>;
  label: string;
  create: (name: string) => Record<string, string>;
  update: (name: string) => Record<string, string>;
}

function getResourceScenarios(): ResourceScenario[] {
  return [
  {
    kind: 'projects',
    label: 'Project',
    create: (name) => ({
      Title: name,
      Role: 'Developer',
      Description: 'E2E initial project',
    }),
    update: (name) => ({
      Title: name,
      Role: 'Lead Developer',
      Description: 'E2E updated project',
    }),
  },
  {
    kind: 'certificates',
    label: 'Certificate',
    create: (name) => ({ 'Certificate Name': name, Issuer: 'E2E Academy' }),
    update: (name) => ({
      'Certificate Name': name,
      Issuer: 'E2E Updated Academy',
    }),
  },
  {
    kind: 'activities',
    label: 'Activity',
    create: (name) => ({
      Title: name,
      Organization: 'E2E Club',
      Description: 'E2E initial activity',
    }),
    update: (name) => ({
      Title: name,
      Organization: 'E2E Updated Club',
      Description: 'E2E updated activity',
    }),
  },
  {
    kind: 'experiences',
    label: 'Experience',
    create: (name) => ({
      Company: name,
      Position: 'Intern',
      Description: 'E2E initial experience',
    }),
    update: (name) => ({
      Company: name,
      Position: 'Junior Engineer',
      Description: 'E2E updated experience',
    }),
  },
  ];
}

function withArticle(label: string) {
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `${article} ${label.toLowerCase()}`;
}
