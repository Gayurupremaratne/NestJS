import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { Optional } from '@nestjs/common';
import { PassInventory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class PassInventoryDto implements PassInventory {
  @IsString()
  id: string;

  @IsString()
  @Exists('stages', 'id', NotFoundHelper)
  stageId: string;

  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  quantity: number;

  date: Date;

  @Optional()
  createdAt: Date;

  @Optional()
  updatedAt: Date;
}

export class PassInventoryAggregate {
  stage_id: string;

  date: Date;

  inventoryQuantity: number;

  reservedQuantity: number;

  cancelledQuantity: number;
}

export class PassInventoryAggregateDto {
  data: PassInventoryAggregate[];
  analytics: {
    totalInventory: number;
    allocatedInventory: number;
    remainingInventory: number;
    cancelledInventory: number;
  };
}

export class PassInventoryAggregateAllocation {
  date: Date;

  inventoryQuantity: number;

  reservedQuantity: number;

  allocatedQuantity: number;
}
