import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdvisorAssignmentQueryDto } from './dto/advisor-assignment-query.dto';
import { CreateAdvisorAssignmentDto } from './dto/create-advisor-assignment.dto';
import { UpdateAdvisorAssignmentDto } from './dto/update-advisor-assignment.dto';
import { AdvisorAssignmentsService } from './advisor-assignments.service';

@ApiTags('advisor-assignments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('advisor-assignments')
export class AdvisorAssignmentsController {
  constructor(private readonly advisorAssignmentsService: AdvisorAssignmentsService) {}

  @ApiCreatedResponse({ description: 'Advisor assignment created' })
  @Post()
  create(
    @Body() dto: CreateAdvisorAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.advisorAssignmentsService.create(dto, user.id);
  }

  @ApiOkResponse({ description: 'Paginated advisor assignments' })
  @Get()
  findAll(@Query() query: AdvisorAssignmentQueryDto) {
    return this.advisorAssignmentsService.findAll(query);
  }

  @ApiOkResponse({ description: 'Advisor assignment detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advisorAssignmentsService.findOne(id);
  }

  @ApiOkResponse({ description: 'Advisor assignment updated' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdvisorAssignmentDto) {
    return this.advisorAssignmentsService.update(id, dto);
  }

  @ApiOkResponse({ description: 'Advisor assignment deleted' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.advisorAssignmentsService.remove(id);
  }
}
