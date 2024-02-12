import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { LocaleService } from './locale.service';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { Public } from 'nest-keycloak-connect';
import { Locale } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

@UseInterceptors(new ResponseInterceptor())
@Controller('locales')
@ApiTags('Locales')
export class LocaleController {
  constructor(private localeService: LocaleService) {}

  @Get()
  @Public()
  async getAllLocales(): Promise<JsonResponse<Locale[]>> {
    return JsonResponseSerializer(await this.localeService.getAllLocales());
  }
}
