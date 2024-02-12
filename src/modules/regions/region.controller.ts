import { checkAbilities } from '@common/decorators/abilities.decorator';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { JsonResponse } from '@common/types';
import { RegionDto } from './dto/region.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { RegionService } from './region.service';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('regions')
@ApiTags('Regions')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.TRAIL })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllRegions(): Promise<JsonResponse<RegionDto[]>> {
    return JsonResponseSerializer(await this.regionService.getAllRegions());
  }
}
