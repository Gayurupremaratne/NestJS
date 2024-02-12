import { RegionTranslation } from '@prisma/client';

export class RegionDto {
  id: string;

  translations: RegionTranslation[];
}
