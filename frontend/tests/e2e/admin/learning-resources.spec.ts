import { expect, test } from '../fixtures';
import { LearningResourcePage } from '../pages';
import { AdminApiClient } from '../utils/admin-api';
import { uniqueE2EName } from '../utils/test-data';

test.describe('Admin learning resource management', () => {
  test('creates, updates, links a skill, and deactivates a resource', async ({
    adminPage,
  }) => {
    test.slow();
    const api = await AdminApiClient.fromPage(adminPage);
    const categoryName = uniqueE2EName('ResourceCategory');
    const skillName = uniqueE2EName('ResourceSkill');
    const resourceTitle = uniqueE2EName('LearningResource');
    const updatedTitle = `${resourceTitle}-Updated`;
    const category = await api.createSkillCategory(categoryName);
    await api.createSkill(skillName, category.id);
    const resources = new LearningResourcePage(adminPage);

    try {
      await resources.goto();
      await resources.expectLoaded();

      const emptyForm = await resources.openCreateForm();
      await resources.expectRequiredValidation(emptyForm);
      await resources.cancel(emptyForm);

      await resources.create({
        title: resourceTitle,
        description: 'E2E resource created through the admin UI',
        type: 'COURSE',
        difficulty: 'BEGINNER',
        provider: 'E2E Academy',
        duration: '6 hours',
        language: 'en',
        url: 'https://example.com/e2e-learning-resource',
      });
      await resources.search(resourceTitle);
      await resources.expectRecord(resourceTitle);

      const drawer = await resources.openDetail(resourceTitle);
      const skillOption = `${skillName} (${categoryName})`;
      await resources.linkSkill(drawer, {
        skill: skillOption,
        targetLevel: 'BASIC',
        roadmapPhase: 'Core Foundation',
        relevanceScore: 80,
        order: 1,
      });
      await expect(
        drawer.getByRole('row').filter({ hasText: skillName }),
      ).toContainText('BASIC');

      await resources.updateSkill(drawer, skillName, {
        targetLevel: 'INTERMEDIATE',
        roadmapPhase: 'Career Track',
        relevanceScore: 90,
        order: 2,
      });
      await expect(
        drawer.getByRole('row').filter({ hasText: skillName }),
      ).toContainText('INTERMEDIATE');

      await resources.unlinkSkill(drawer, skillName);
      await expect(drawer.getByText(skillName, { exact: true })).toHaveCount(0);
      await drawer.getByRole('button', { name: 'Close' }).click();

      await resources.update(resourceTitle, {
        title: updatedTitle,
        description: 'E2E resource updated through the admin UI',
        type: 'DOCUMENT',
        difficulty: 'INTERMEDIATE',
        provider: 'E2E Academy Updated',
        duration: '8 hours',
        language: 'en',
        url: 'https://example.com/e2e-learning-resource-updated',
        status: 'ACTIVE',
      });
      await resources.search(updatedTitle);
      await resources.expectRecord(updatedTitle);

      await resources.deactivate(updatedTitle);
      await expect(resources.recordRow(updatedTitle)).toHaveCount(0);
    } finally {
      const resource =
        (await api.findLearningResource(updatedTitle)) ??
        (await api.findLearningResource(resourceTitle));
      if (resource) {
        for (const link of resource.skills ?? []) {
          await api.unlinkLearningResourceSkill(resource.id, link.skillId);
        }
        if (resource.status === 'ACTIVE') {
          await api.deactivateLearningResource(resource.id);
        }
      }
      await api.cleanupCatalog({
        skillNames: [skillName],
        categoryNames: [categoryName],
      });
    }
  });
});
