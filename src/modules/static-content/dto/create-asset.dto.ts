import { Prisma } from '@prisma/client';

export class CreateAssetDto implements Prisma.AssetKeysCreateInput {
  id?: string;

  createdAt?: string | Date;

  updatedAt?: string | Date;

  fileKey: string;

  module: string;
}
