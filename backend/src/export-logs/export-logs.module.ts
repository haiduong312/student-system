import { Global, Module } from '@nestjs/common';
import { ExportLogsService } from './export-logs.service';

@Global()
@Module({
  providers: [ExportLogsService],
  exports: [ExportLogsService],
})
export class ExportLogsModule {}
