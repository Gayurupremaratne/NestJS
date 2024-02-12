import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { JsonResponse, AppVersions } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { Public } from 'nest-keycloak-connect';
import { RELEASE_VERSION, MINIMUM_MOBILE_VERSION } from './common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  healthCheck(): JsonResponse<string> {
    return JsonResponseSerializer(this.appService.getHealthCheck());
  }

  @Get('versions')
  @Public()
  getVersions(): JsonResponse<AppVersions> {
    return JsonResponseSerializer({
      minimumMobileVersion: MINIMUM_MOBILE_VERSION,
      currentApiVersion: RELEASE_VERSION,
    });
  }
}
