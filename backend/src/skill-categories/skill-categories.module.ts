import { Module } from '@nestjs/common';
import { SkillCategoriesController } from './skill-categories.controller';
import { SkillCategoriesService } from './skill-categories.service';

@Module({
  controllers: [SkillCategoriesController],
  providers: [SkillCategoriesService],
  exports: [SkillCategoriesService],
})
export class SkillCategoriesModule {}
