import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../student-access/student-access-policy.module';
import { PrivateUploadsController } from './private-uploads.controller';
import { PrivateUploadsService } from './private-uploads.service';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [PrivateUploadsController],
  providers: [PrivateUploadsService],
})
export class PrivateUploadsModule {}
