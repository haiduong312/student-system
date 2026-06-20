import { Module } from '@nestjs/common';
import { StudentAccessPolicyService } from './student-access-policy.service';

@Module({
  providers: [StudentAccessPolicyService],
  exports: [StudentAccessPolicyService],
})
export class StudentAccessPolicyModule {}
