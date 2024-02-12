import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { JsonResponse } from '@common/types';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto, OrdersByStageDto } from './dto/order.dto';
import { OrderService } from './order.service';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { PLATFORM, RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { HeaderValidationPipe } from '@common/pipes/header-validation.pipe';
import { RequestHeaders } from '@common/decorators/RequestHeadersDecorator';
import { GetOrdersByStageParams, GetOrdersByStageQuery } from './dto/get-order.dto';
import { AuthGuard } from '../casl/authorization-guard';
import { UserRepository } from '@user/user.repository';
import { OrderEligibilityQuery, OrderEligibilityResponse } from './dto/order-eligibility-dto';

@UseInterceptors(new ResponseInterceptor())
@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private userService: UserRepository,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiHeader({
    name: 'Platform',
    description: 'Need platform type (WEB | MOBILE)',
  })
  @UsePipes(HeaderValidationPipe)
  @UseGuards(AuthGuard)
  async createOrder(
    @Body() data: CreateOrderDto,
    @AuthenticatedUser() user,
    @RequestHeaders() { headers },
  ): Promise<JsonResponse<OrderDto>> {
    const { platform } = headers;
    let userId = '';
    const authUserData = await this.userService.getUser(user.sub);
    const userPermission = await this.userService.getPermissions(authUserData.role_id);

    if (platform === PLATFORM.mobile) {
      userId = user.sub;
    } else if (platform === PLATFORM.web) {
      const isAuthorized = this.orderService.checkPermissionToCreateOrder(userPermission);

      if (!isAuthorized) {
        throw new ForbiddenException('You are not allowed to perform this action');
      }

      if (data.userId) {
        userId = data.userId;
      } else {
        throw new BadRequestException('User ID is required');
      }
    }

    return JsonResponseSerializer(await this.orderService.createOrder(data, userId));
  }

  @Get('/pass/:stageId')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PASS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getPassOrdersByStage(
    @Param() params: GetOrdersByStageParams,
    @Query() query: GetOrdersByStageQuery,
  ): Promise<JsonResponse<OrdersByStageDto>> {
    return JsonResponseSerializer(await this.orderService.getOrdersByStage(params.stageId, query));
  }

  @Delete('/:orderId')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.PASS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteOrder(@Param('orderId') orderId: string): Promise<JsonResponse<string>> {
    return JsonResponseSerializer(await this.orderService.deleteOrder(orderId));
  }

  @Get('/check-eligibility')
  @ApiBearerAuth()
  @UsePipes(HeaderValidationPipe)
  @ApiOperation({ summary: 'This end point is for mobile' })
  @UseGuards(AuthGuard)
  async checkMobileOrderEligibility(
    @AuthenticatedUser() user,
    @Query() query: OrderEligibilityQuery,
  ): Promise<JsonResponse<OrderEligibilityResponse>> {
    return JsonResponseSerializer(await this.orderService.checkOrderEligibility(query, user.sub));
  }
}
