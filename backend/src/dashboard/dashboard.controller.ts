import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Student dashboard summary' })
  @Get('student')
  getStudentDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getStudentDashboard(user.id);
  }

  @Roles(UserRole.LECTURER)
  @ApiOkResponse({ description: 'Lecturer dashboard summary' })
  @Get('lecturer')
  getLecturerDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getLecturerDashboard(user.id);
  }

  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ description: 'Admin dashboard summary' })
  @Get('admin')
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }
}
