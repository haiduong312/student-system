import { Module } from '@nestjs/common';
import { CatalogContextInvalidationModule } from '../common/catalog-invalidation/catalog-context-invalidation.module';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [CatalogContextInvalidationModule],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
