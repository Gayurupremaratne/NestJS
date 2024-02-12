import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { FcmTokensService } from './fcm-tokens.service';
import { JsonResponse } from '@common/types';
import { FcmTokenDto } from './dto/fcm-token.dto';
import { CreateFcmTokenDto } from './dto/create-fcm-token.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../casl/authorization-guard';

@ApiTags('FCM Tokens')
@Controller()
export class FcmTokensController {
  constructor(private readonly fcmTokensService: FcmTokensService) {}

  @Get('fcm-tokens')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.FCM })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getFcmTokensByUserId(@AuthenticatedUser() user): Promise<JsonResponse<FcmTokenDto[]>> {
    return JsonResponseSerializer(await this.fcmTokensService.getFcmTokensByUserId(user.sub));
  }

  @Post('fcm-tokens')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.FCM })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createFcmToken(
    @AuthenticatedUser() user,
    @Body() createFcmTokenDto: CreateFcmTokenDto,
  ): Promise<JsonResponse<FcmTokenDto>> {
    return JsonResponseSerializer(
      await this.fcmTokensService.createFcmToken(user.sub, createFcmTokenDto),
    );
  }

  @Delete('fcm-tokens')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.FCM })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async removeFcmTokensByUserId(@AuthenticatedUser() user) {
    return await this.fcmTokensService.removeAllFcmTokensByUserId(user.sub);
  }
}
