import { expect, test } from '../fixtures';
import { CatalogManagementPage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Admin catalog management', () => {
  test('manages a skill category and validates required fields', async ({
    adminPage,
  }) => {
    const api = await AdminApiClient.fromPage(adminPage);
    const categoryName = uniqueE2EName('Category');
    const updatedName = `${categoryName}-Updated`;
    const categories = new CatalogManagementPage(adminPage, 'skill-categories');

    try {
      await categories.goto();
      await categories.expectLoaded();

      const emptyForm = await categories.openCreateForm();
      await categories.expectRequiredFieldValidation(emptyForm);
      await categories.cancelDialog(emptyForm);

      await categories.create({
        name: categoryName,
        description: 'E2E category created through the admin UI',
      });
      await categories.search(categoryName);
      await categories.expectRecord(categoryName);

      await categories.update(categoryName, {
        name: updatedName,
        description: 'E2E category updated through the admin UI',
        status: 'INACTIVE',
      });
      await categories.search(updatedName);
      await categories.expectRecordStatus(updatedName, 'INACTIVE');

      await categories.update(updatedName, {
        name: updatedName,
        status: 'ACTIVE',
      });
      await categories.expectRecordStatus(updatedName, 'ACTIVE');

      await categories.delete(updatedName);
      await expect(categories.recordRow(updatedName)).toHaveCount(0);
    } finally {
      await api.cleanupCatalog({ categoryNames: [categoryName, updatedName] });
    }
  });

  test('creates, searches, edits, and removes a skill', async ({ adminPage }) => {
    const api = await AdminApiClient.fromPage(adminPage);
    const categoryName = uniqueE2EName('SkillCategory');
    const skillName = uniqueE2EName('Skill');
    const updatedName = `${skillName}-Updated`;
    await api.createSkillCategory(categoryName);
    const skills = new CatalogManagementPage(adminPage, 'skills');

    try {
      await skills.goto();
      await skills.expectLoaded();
      await skills.create({
        name: skillName,
        description: 'E2E skill created through the admin UI',
        type: 'CAREER_SPECIFIC',
        category: categoryName,
        status: 'ACTIVE',
      });

      await skills.search(skillName);
      await skills.expectRecord(skillName);
      await skills.update(skillName, {
        name: updatedName,
        description: 'E2E skill updated through the admin UI',
        type: 'CAREER_SPECIFIC',
        category: categoryName,
        status: 'ACTIVE',
      });
      await skills.search(updatedName);
      await skills.expectRecord(updatedName);

      await skills.delete(updatedName);
      await expect(skills.recordRow(updatedName)).toHaveCount(0);
    } finally {
      await api.cleanupCatalog({
        skillNames: [skillName, updatedName],
        categoryNames: [categoryName],
      });
    }
  });

  test('creates, searches, edits, and opens a career goal detail', async ({
    adminPage,
  }) => {
    const api = await AdminApiClient.fromPage(adminPage);
    const careerGoalName = uniqueE2EName('CareerGoal');
    const updatedName = `${careerGoalName}-Updated`;
    const careerGoals = new CatalogManagementPage(adminPage, 'career-goals');

    try {
      await careerGoals.goto();
      await careerGoals.expectLoaded();
      await careerGoals.create({
        name: careerGoalName,
        description: 'E2E career goal created through the admin UI',
        status: 'ACTIVE',
      });

      await careerGoals.search(careerGoalName);
      await careerGoals.expectRecord(careerGoalName);
      await careerGoals.update(careerGoalName, {
        name: updatedName,
        description: 'E2E career goal updated through the admin UI',
        status: 'ACTIVE',
      });
      await careerGoals.search(updatedName);
      await careerGoals.expectRecord(updatedName);
      await careerGoals.manageCareerGoal(updatedName);
    } finally {
      await api.cleanupCatalog({ careerGoalNames: [careerGoalName, updatedName] });
    }
  });

  test('manages specializations and career required skills', async ({
    adminPage,
  }) => {
    const api = await AdminApiClient.fromPage(adminPage);
    const categoryName = uniqueE2EName('RequiredCategory');
    const skillName = uniqueE2EName('RequiredSkill');
    const careerGoalName = uniqueE2EName('RequiredCareer');
    const specializationName = uniqueE2EName('Specialization');
    const updatedSpecializationName = `${specializationName}-Updated`;

    const category = await api.createSkillCategory(categoryName);
    await api.createSkill(skillName, category.id);
    const availableSkills = await api.listSkills({
      status: 'ACTIVE',
      type: 'CAREER_SPECIFIC',
      limit: 100,
    });
    expect(availableSkills.some((skill) => skill.name === skillName)).toBe(true);
    await api.createCareerGoal(careerGoalName);
    const careerGoals = new CatalogManagementPage(adminPage, 'career-goals');

    try {
      await careerGoals.goto();
      await careerGoals.search(careerGoalName);
      await careerGoals.expectRecord(careerGoalName);
      await careerGoals.manageCareerGoal(careerGoalName);

      await careerGoals.createRequiredSkill(careerGoalName, {
        skill: skillName,
        requiredLevel: 1,
        weight: 1,
        learningOrder: 91,
        roadmapPhase: 'Career Track',
      });
      await careerGoals.expectRequiredSkill(careerGoalName, skillName);
      await careerGoals.updateRequiredSkill(careerGoalName, skillName, {
        requiredLevel: 2,
        weight: 2,
        learningOrder: 92,
        roadmapPhase: 'Practice Project',
      });
      await careerGoals.expectRequiredSkillValues(careerGoalName, skillName, {
        learningOrder: 92,
        roadmapPhase: 'PRACTICE_PROJECT',
      });
      await careerGoals.deleteRequiredSkill(careerGoalName, skillName);
      await careerGoals.expectRequiredSkillMissing(careerGoalName, skillName);

      await careerGoals.createSpecialization(careerGoalName, {
        name: specializationName,
        description: 'E2E specialization created through the admin UI',
        active: true,
      });
      await careerGoals.expectSpecialization(
        careerGoalName,
        specializationName,
        'ACTIVE',
      );
      await careerGoals.updateSpecialization(
        careerGoalName,
        specializationName,
        {
          name: updatedSpecializationName,
          description: 'E2E specialization updated through the admin UI',
          active: true,
        },
      );
      await careerGoals.deactivateSpecialization(
        careerGoalName,
        updatedSpecializationName,
      );
      await careerGoals.expectSpecialization(
        careerGoalName,
        updatedSpecializationName,
        'INACTIVE',
      );
      await careerGoals.updateSpecialization(
        careerGoalName,
        updatedSpecializationName,
        {
          name: updatedSpecializationName,
          active: true,
        },
      );
      await careerGoals.expectSpecialization(
        careerGoalName,
        updatedSpecializationName,
        'ACTIVE',
      );
    } finally {
      await api.cleanupCatalog({
        careerGoalNames: [careerGoalName],
        skillNames: [skillName],
        categoryNames: [categoryName],
      });
    }
  });
});
