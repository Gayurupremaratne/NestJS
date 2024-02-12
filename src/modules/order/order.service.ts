import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersByStageQuery } from './dto/get-order.dto';
import { OrderDto, OrdersByStageDto } from './dto/order.dto';
import { OrderRepository } from './order.repository';
import { RBAC_SUBJECTS, RBAC_ACTIONS } from '@common/constants';
import { OrderEligibilityQuery, OrderEligibilityResponse } from './dto/order-eligibility-dto';

@Injectable()
export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async createOrder(data: CreateOrderDto, userId: string): Promise<OrderDto> {
    return plainToClass(OrderDto, await this.orderRepository.createOrder(data, userId));
  }

  async getOrdersByStage(stageId: string, query: GetOrdersByStageQuery): Promise<OrdersByStageDto> {
    return plainToClass(
      OrdersByStageDto,
      await this.orderRepository.getOrdersByStage(stageId, query),
    );
  }

  async deleteOrder(orderId: string): Promise<string> {
    return await this.orderRepository.deleteOrder(orderId);
  }

  async cancelOrdersByUserId(userId: string) {
    return await this.orderRepository.cancelOrdersByUserId(userId);
  }

  checkPermissionToCreateOrder = (userPermission) => {
    return userPermission.some((permission) => {
      return (
        (permission.permission.subject === RBAC_SUBJECTS.PASS &&
          (permission.permission.action === RBAC_ACTIONS.CREATE ||
            permission.permission.action === RBAC_ACTIONS.MANAGE)) ||
        (permission.permission.action === RBAC_ACTIONS.MANAGE &&
          permission.permission.subject === RBAC_SUBJECTS.ALL)
      );
    });
  };

  async checkOrderEligibility(
    query: OrderEligibilityQuery,
    userId: string,
  ): Promise<OrderEligibilityResponse> {
    return plainToClass(
      OrderEligibilityResponse,
      await this.orderRepository.checkOrderEligibility(query, userId),
    );
  }
}
