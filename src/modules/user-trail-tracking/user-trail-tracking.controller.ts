import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserTrailTrackingService } from './user-trail-tracking.service';
import { JsonResponseSerializer } from '@common/serializers';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { CreateUserTrailTrackingDto } from './dto/create-user-trail-tracking.dto';
import { AuthGuard } from '../casl/authorization-guard';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('User Trail Tracking')
@UseInterceptors(new ResponseInterceptor())
@Controller('user-trail-tracking')
export class UserTrailTrackingController {
  constructor(private readonly userTrailTrackingService: UserTrailTrackingService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @SkipThrottle()
  async createUserTrack(
    @AuthenticatedUser() user,
    @Body() trackingData: CreateUserTrailTrackingDto,
  ) {
    return JsonResponseSerializer(
      await this.userTrailTrackingService.updateUserTrack(trackingData, user.sub),
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getUserTrack(@AuthenticatedUser() user) {
    return JsonResponseSerializer(
      await this.userTrailTrackingService.getUserOngoingTrack(user.sub),
    );
  }
}
