import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { UsersModule } from '../users/users.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [UsersModule, StudentAccessPolicyModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
