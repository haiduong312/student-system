import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoadmapQueryDto } from './dto/roadmap-query.dto';
import { UpdateRoadmapItemStatusDto } from './dto/update-roadmap-item-status.dto';
import { RoadmapsService } from './roadmaps.service';

@ApiTags('roadmaps')
@ApiBearerAuth()
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Roles(UserRole.STUDENT)
  @ApiCreatedResponse({ description: 'Roadmap generated for current student' })
  @Post('generate/me')
  generateMine(@CurrentUser() user: AuthenticatedUser) {
    return this.roadmapsService.generateForCurrentStudent(user.id);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Current student roadmaps' })
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: RoadmapQueryDto) {
    return this.roadmapsService.findMine(user.id, query);
  }

  @Roles(UserRole.STUDENT, UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Roadmap detail' })
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roadmapsService.findOne(user, id);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Roadmap item status updated' })
  @Patch('items/:id/status')
  updateItemStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoadmapItemStatusDto,
  ) {
    return this.roadmapsService.updateItemStatus(user.id, id, dto);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @ApiCreatedResponse({ description: 'Roadmap generated for a student' })
  @Post('students/:studentId/generate')
  generateForStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    return this.roadmapsService.generateForStudent(user, studentId);
  }
}
