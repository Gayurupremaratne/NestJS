import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { RequestHeaders } from '@common/decorators/RequestHeadersDecorator';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { HeaderValidationPipe } from '@common/pipes/header-validation.pipe';
import { JsonResponseSerializer } from '@common/serializers';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { DeletePassParamDto, GetPassDto, UserPassParamDto } from './dto';
import { PassesService } from './passes.service';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { TransferPassParamDto } from './dto/request/transfer-pass-params.dto';
import { AmendPassRequestBodyDto } from './dto/request/amend-pass-request-body.dto';
import { JsonResponse } from '@common/types';
import { Passes } from '@prisma/client';
import { AmendPassParamsDto } from './dto/request/amend-pass-params.dto';
import { GetUserActivePassParamDto } from './dto/request/passes-stage-params.dto';
import { AuthGuard } from '../casl/authorization-guard';

@UseInterceptors(new ResponseInterceptor())
@Controller('/passes')
@ApiTags('Passes')
export class PassesController {
  constructor(private readonly passesService: PassesService) {}

  @Get('/me')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiOperation({
    summary: 'This end point is used by the mobile, the platform header is required',
  })
  @ApiHeader({
    name: 'Platform',
    description: 'If the platform header is MOBILE',
  })
  @UseGuards(AuthGuard)
  async findAllByUser(
    @Query() getPassDto: GetPassDto,
    @AuthenticatedUser() user,
    @RequestHeaders() { headers },
  ) {
    const { sub } = user;
    const { platform } = headers;
    const response = await this.passesService.findAllByUser(getPassDto, sub, platform);
    return JsonResponseSerializer(response);
  }

  @Get('/user/:userId')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiOperation({ summary: 'This end point is by the Admin portal' })
  @ApiHeader({
    name: 'Platform',
    description: 'If the platform header is WEB',
  })
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PASS_INVENTORY })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async findAllPassesByUser(
    @Param() params: UserPassParamDto,
    @Query() getPassDto: GetPassDto,
    @RequestHeaders() { headers },
  ) {
    const { platform } = headers;
    return JsonResponseSerializer(
      await this.passesService.findAllByUser(getPassDto, params.userId, platform),
    );
  }

  @Get('/my-trail')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'This end point is used by the mobile, in order to get the users trails, only type of expired and reserved is used here',
  })
  /**
   * @description My trails are implemented in the "passes" table because access to user trails
   * is done through the "passes" table.
   */
  async findAllUserTrails(@Query() getPassDto: GetPassDto, @AuthenticatedUser() user) {
    const { sub } = user;
    return JsonResponseSerializer(await this.passesService.getMyTrails(sub, getPassDto));
  }

  @Get('/stage/:stageId')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiOperation({ summary: 'This end point is for mobile' })
  @ApiHeader({
    name: 'Platform',
    description: 'If the platform header is MOBILE',
  })
  @UseGuards(AuthGuard)
  async getUserActivePassByStageId(
    @Param() data: GetUserActivePassParamDto,
    @AuthenticatedUser() user,
  ) {
    return JsonResponseSerializer(
      await this.passesService.getUserActivePassByStageId(user.sub, data.stageId),
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiOperation({ summary: 'This end point is for mobile' })
  @ApiHeader({
    name: 'Platform',
    description: 'If the platform header is MOBILE',
  })
  @UseGuards(AuthGuard)
  async deletePassById(@Param() params: DeletePassParamDto, @AuthenticatedUser() user) {
    return JsonResponseSerializer(await this.passesService.softDeletePass(params.id, user.sub));
  }

  @Put('/:id/transfer')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiHeader({
    name: 'Platform',
    description: 'Valid Values: WEB/MOBILE',
  })
  @UseGuards(AuthGuard)
  async transferPassById(@Param() params: TransferPassParamDto, @AuthenticatedUser() user) {
    return JsonResponseSerializer(await this.passesService.transferPass(params.id, user.sub));
  }

  @Put('amend/:orderId')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiHeader({
    name: 'Platform',
    description: 'Valid Values: WEB/MOBILE',
  })
  @UseGuards(AuthGuard)
  async amendPass(
    @Body() data: AmendPassRequestBodyDto,
    @Param() params: AmendPassParamsDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<Passes[] | void>> {
    return JsonResponseSerializer(
      await this.passesService.amendPass(params.orderId, data.date, data.stageId, user.sub),
    );
  }
}
