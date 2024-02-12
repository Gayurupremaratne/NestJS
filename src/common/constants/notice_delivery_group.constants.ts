/**
 * Delivery group enum for notices
 */

export enum DeliveryGroupEnum {
  ALL = 'ALL',
  STAGE = 'STAGE',
}

export const DELIVERY_GROUP = ['ALL', 'STAGE'] as const;

export type DeliveryGroup = (typeof DELIVERY_GROUP)[number];

export const DELIVERY_GROUP_CODE: Record<DeliveryGroup, number> = {
  ALL: 0,
  STAGE: 1,
};
