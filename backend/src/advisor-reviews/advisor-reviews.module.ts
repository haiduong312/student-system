import { Module } from '@nestjs/common';
import { StudentAccessPolicyModule } from '../common/student-access/student-access-policy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdvisorReviewsController } from './advisor-reviews.controller';
import { AdvisorReviewsService } from './advisor-reviews.service';

@Module({
  imports: [StudentAccessPolicyModule, NotificationsModule],
  controllers: [AdvisorReviewsController],
  providers: [AdvisorReviewsService],
  exports: [AdvisorReviewsService],
})
export class AdvisorReviewsModule {}
