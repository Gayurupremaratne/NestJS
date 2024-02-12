import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  ParseArrayPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PassConditionTranslation } from '@prisma/client';
import { Public } from 'nest-keycloak-connect';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { PassConditionParamDto } from './dto/pass-condition-param.dto';
import { PassConditionTranslationResponse } from './dto/pass-condition-response.dto';
import { PassConditionDto } from './dto/pass-condition.dto';
import { UpsertPassConditionTranslationDto } from './dto/upsert-pass-condition-translation.dto';
import { PassConditionService } from './pass-condition.service';
import { AuthGuard } from '../../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@Controller('pass-conditions')
@ApiTags('Pass Conditions')
export class PassConditionController {
  constructor(private readonly passConditionService: PassConditionService) {}

  @Get()
  @Public()
  async getAllGuidelineTranslations(): Promise<JsonResponse<PassConditionTranslationResponse>> {
    return JsonResponseSerializer(await this.passConditionService.getAllPassConditions());
  }

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.PASS_CONDITION })
  async upsertGuidelineTranslation(
    @Body(new ParseArrayPipe({ items: UpsertPassConditionTranslationDto }))
    data: UpsertPassConditionTranslationDto[],
  ): Promise<JsonResponse<PassConditionTranslation[]>> {
    return JsonResponseSerializer(
      await this.passConditionService.upsertPassConditionTranslation(data),
    );
  }

  @Delete()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.PASS_CONDITION })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async removePassConditionTranslation(
    @Query() params: PassConditionParamDto,
  ): Promise<JsonResponse<PassConditionDto>> {
    return JsonResponseSerializer(
      await this.passConditionService.removePassConditionTranslation(params),
    );
  }
}
