import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { AdvisorReviewsModule } from './advisor-reviews/advisor-reviews.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { LecturersModule } from './lecturers/lecturers.module';
import { AdvisorAssignmentsModule } from './advisor-assignments/advisor-assignments.module';
import { SkillCategoriesModule } from './skill-categories/skill-categories.module';
import { SkillsModule } from './skills/skills.module';
import { LearningResourcesModule } from './learning-resources/learning-resources.module';
import { CareerGoalsModule } from './career-goals/career-goals.module';
import { ProfilesModule } from './profiles/profiles.module';
import { EvidencesModule } from './evidences/evidences.module';
import { ExportLogsModule } from './export-logs/export-logs.module';
import { CompetencyAnalysisModule } from './competency-analysis/competency-analysis.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RecommendationTemplatesModule } from './recommendation-templates/recommendation-templates.module';
import { RoadmapsModule } from './roadmaps/roadmaps.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AssessmentQuestionsModule } from './assessment-questions/assessment-questions.module';
import { AssessmentsModule } from './assessments/assessments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ActivityLogsModule,
    ExportLogsModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    LecturersModule,
    AdvisorAssignmentsModule,
    SkillCategoriesModule,
    SkillsModule,
    LearningResourcesModule,
    CareerGoalsModule,
    ProfilesModule,
    EvidencesModule,
    AdvisorReviewsModule,
    CompetencyAnalysisModule,
    RecommendationsModule,
    RecommendationTemplatesModule,
    RoadmapsModule,
    NotificationsModule,
    DashboardModule,
    AssessmentQuestionsModule,
    AssessmentsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
