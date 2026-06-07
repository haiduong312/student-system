import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto';
import { RoadmapHistoryItemDto, RoadmapResponseDto } from './dto/roadmap-response.dto';
import { UpdateRoadmapItemStatusDto } from './dto/update-roadmap-item-status.dto';
import { RoadmapsService } from './roadmaps.service';

@ApiTags('roadmaps')
@ApiBearerAuth()
@Controller()
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Roles(UserRole.STUDENT)
  @ApiBody({ type: GenerateRoadmapDto, required: false })
  @ApiCreatedResponse({
    description: 'Roadmap generated for current student',
    type: RoadmapResponseDto,
  })
  @Post('roadmaps/generate/me')
  generateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateRoadmapDto,
  ) {
    return this.roadmapsService.generateMyRoadmap(user.id, dto);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({
    description: 'Current active roadmap for current student. Returns null when absent.',
    type: RoadmapResponseDto,
  })
  @Get('roadmaps/me')
  getMyActiveRoadmap(@CurrentUser() user: AuthenticatedUser) {
    return this.roadmapsService.getMyActiveRoadmap(user.id);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({
    description: 'Roadmap version history for current student',
    type: [RoadmapHistoryItemDto],
  })
  @Get('roadmaps/history/me')
  getMyRoadmapHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.roadmapsService.getMyRoadmapHistory(user.id);
  }

  @Roles(UserRole.STUDENT, UserRole.LECTURER, UserRole.ADMIN)
  @ApiOkResponse({ description: 'Roadmap detail', type: RoadmapResponseDto })
  @Get('roadmaps/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roadmapsService.getRoadmapDetailWithAuthorization(user, id);
  }

  @Roles(UserRole.STUDENT)
  @ApiOkResponse({ description: 'Roadmap item status updated', type: RoadmapResponseDto })
  @Patch(['roadmap-items/:id/status', 'roadmaps/items/:id/status'])
  updateItemStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoadmapItemStatusDto,
  ) {
    return this.roadmapsService.updateRoadmapItemStatus(user.id, id, dto);
  }

  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  @ApiCreatedResponse({
    description: 'Roadmap generated for a student',
    type: RoadmapResponseDto,
  })
  @Post('roadmaps/students/:studentId/generate')
  generateForStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    return this.roadmapsService.generateForStudent(user, studentId);
  }
}
