import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetAllStagesDropDownDto } from './dto/dropdown-stage.dto';
import { LiteStageService } from './lite-stage.service';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Lite')
@Controller('lite/stages')
export class LiteStageController {
  constructor(private liteStageService: LiteStageService) {}

  @Get()
  @ApiBearerAuth()
  async getAllForDropdown(): Promise<JsonResponse<GetAllStagesDropDownDto[]>> {
    return JsonResponseSerializer(await this.liteStageService.getAllForDropdown());
  }
}
