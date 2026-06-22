import { Module } from '@nestjs/common';
import { EvidenceVerificationService } from '../common/evidence-verification/evidence-verification.service';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, EvidenceVerificationService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
