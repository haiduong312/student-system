import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [StudentAccessPolicyModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
