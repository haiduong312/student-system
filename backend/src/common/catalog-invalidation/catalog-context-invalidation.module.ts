import { Module } from '@nestjs/common';
import { CatalogContextInvalidationService } from './catalog-context-invalidation.service';

@Module({
  providers: [CatalogContextInvalidationService],
  exports: [CatalogContextInvalidationService],
})
export class CatalogContextInvalidationModule {}
