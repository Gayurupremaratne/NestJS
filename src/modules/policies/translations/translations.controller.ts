import { AbilitiesGuard } from '../../casl/abilities.guard';
import { AuthGuard } from '../../casl/authorization-guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TranslationDto } from '@policies/dto/translation.dto';
import { UpsertTranslationQueryDto } from '@policies/dto/upsert-translation-query.dto';
import { UpsertTranslationDto } from '../dto/upsert-translation.dto';
import { TranslationsService } from './translations.service';

@Controller('policies')
@ApiTags('Policies')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Put(':policyId/translations/:localeId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.POLICIES_AND_CONDITIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  @ApiQuery({ type: UpsertTranslationDto })
  async upsert(
    @Param() queryParameters: UpsertTranslationQueryDto,
    @Body() upsertTranslationDto: UpsertTranslationDto,
  ): Promise<JsonResponse<TranslationDto>> {
    const upsertTranslation = await this.translationsService.upsert({
      ...upsertTranslationDto,
      ...queryParameters,
    });

    return JsonResponseSerializer(upsertTranslation);
  }
}
