import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOkResponse({ description: 'Current user notifications' })
  @Get('me')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findMine(user.id, query);
  }

  @ApiOkResponse({ description: 'Current user unread notification count' })
  @Get('me/unread-count')
  countUnread(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.countUnread(user.id);
  }

  @ApiOkResponse({ description: 'Notification marked as read' })
  @Patch(':id/read')
  markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @ApiOkResponse({ description: 'Notification marked as unread' })
  @Patch(':id/unread')
  markAsUnread(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markAsUnread(user.id, id);
  }

  @ApiOkResponse({ description: 'All current user notifications marked as read' })
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
