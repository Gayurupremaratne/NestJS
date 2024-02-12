import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Get,
  Query,
  Put,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { CreatePushNotificationDto } from './dto/notification.dto';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../casl/authorization-guard';
import { LoggedUserNotificationQueryParams } from './dto/logged-user-notification-query-params.dto';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { JsonResponse } from '@common/types';
import { PaginatedResult } from '@common/helpers';
import { NotificationResponse } from './dto/notification-response.dto';
import { UpdateNotificationReadStatusDto } from './dto/update-notification-read-status.dto';

@ApiTags('Notifications')
@UseInterceptors(new ResponseInterceptor())
@Controller('push-notification')
export class PushNotificationController {
  constructor(private readonly pushNotificationService: PushNotificationService) {}

  @Post()
  @checkAbilities({
    action: RBAC_ACTIONS.CREATE,
    subject: RBAC_SUBJECTS.NOTIFICATIONS,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AbilitiesGuard)
  async sendBatchedNotifications(@Body() notificationData: CreatePushNotificationDto) {
    return JsonResponseSerializer(
      await this.pushNotificationService.sendBatchedNotifications(notificationData),
    );
  }

  @Put('/read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'This end point is used by the mobile to mark notifications as read by user',
  })
  @ApiHeader({
    name: 'Platform',
    description: 'If the platform header is MOBILE',
  })
  async updateNotificationsReadStatus(
    @AuthenticatedUser() user,
    @Body() notificationIds: UpdateNotificationReadStatusDto,
  ): Promise<JsonResponse<UpdateNotificationReadStatusDto>> {
    return JsonResponseSerializer(
      await this.pushNotificationService.updateNotificationsReadStatus(user.sub, notificationIds),
    );
  }

  @Get('/me')
  @ApiBearerAuth()
  async getLoggedUserNotifications(
    @AuthenticatedUser() user,
    @Query() params: LoggedUserNotificationQueryParams,
  ): Promise<JsonResponse<PaginatedResult<NotificationResponse>>> {
    return JsonResponseSerializer(
      await this.pushNotificationService.getLoggedUserNotifications(user.sub, params),
    );
  }
}
