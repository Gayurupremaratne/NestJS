import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JsonResponseSerializer } from '@common/serializers';
import { PassInventoryService } from './pass-inventory.service';
import { JsonResponse } from '@common/types';
import {
  PassInventoryDto,
  PassInventoryAggregateDto,
  PassInventoryAggregateAllocation,
} from './dto/pass-inventory.dto';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { CreatePassInventoryDto } from './dto/create-pass-inventory.dto';
import { PassInventoryIdentifierDto } from './dto/pass-inventory-param';
import { BatchUpdatePassInventoryDto } from './dto/batch-update-pass-inventory';
import { BatchUpdateIdentifierDto, BatchIdentifierDto } from './dto/batch-param';
import {
  PassInventoryAggregateReservationParamDto,
  PassInventoryAggregateReservationQueryDto,
} from './dto/pass-inventory-reservation.dto';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('pass-inventory')
@ApiTags('PassInventory')
export class PassInventoryController {
  constructor(private readonly passInventoryService: PassInventoryService) {}

  @Get('stage/:stageId/inventory/:month/:year')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  @UseGuards(AuthGuard)
  async findPassInventoryByMonth(
    @Param() queryParams: BatchIdentifierDto,
  ): Promise<JsonResponse<PassInventoryAggregateDto>> {
    return JsonResponseSerializer(
      await this.passInventoryService.findPassInventoryByMonth(
        queryParams.stageId,
        queryParams.month,
        queryParams.year,
      ),
    );
  }

  @Get('stage/:stageId/inventory-allocation/:month/:year')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  @UseGuards(AuthGuard)
  async findPassInventoryAllocationByMonth(
    @Param() queryParams: BatchIdentifierDto,
  ): Promise<JsonResponse<PassInventoryAggregateAllocation[]>> {
    return JsonResponseSerializer(
      await this.passInventoryService.findPassInventoryAllocationByMonth(
        queryParams.stageId,
        queryParams.month,
        queryParams.year,
      ),
    );
  }

  @Get('stage/:stageId/inventory/pass-reservations')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async findPassInventoryReservationByDay(
    @Param() params: PassInventoryAggregateReservationParamDto,
    @Query() query: PassInventoryAggregateReservationQueryDto,
  ): Promise<
    JsonResponse<{
      count: number;
    }>
  > {
    return JsonResponseSerializer(
      await this.passInventoryService.findPassInventoryReservationByDay(
        params.stageId,
        query.startDate,
        query.endDate,
      ),
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AbilitiesGuard)
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  async findOne(
    @Param() queryParams: PassInventoryIdentifierDto,
  ): Promise<JsonResponse<PassInventoryDto>> {
    return JsonResponseSerializer(await this.passInventoryService.findOne(queryParams.id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AbilitiesGuard)
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  async create(@Body() data: CreatePassInventoryDto): Promise<JsonResponse<PassInventoryDto>> {
    return JsonResponseSerializer(await this.passInventoryService.create(data));
  }

  @Put('batch-update/:stageId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, AbilitiesGuard)
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  async updateQuantity(
    @Param() queryParams: BatchUpdateIdentifierDto,
    @Body() data: BatchUpdatePassInventoryDto,
  ): Promise<JsonResponse<PassInventoryDto[]>> {
    return JsonResponseSerializer(
      await this.passInventoryService.updateInventoriesByBatch(queryParams.stageId, data),
    );
  }
}
