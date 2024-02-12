import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Region } from '@prisma/client';

@Injectable()
export class RegionRepository {
  constructor(private prisma: PrismaService) {}

  async getAllRegions(): Promise<Region[]> {
    return await this.prisma.region.findMany({
      include: {
        regionTranslation: true,
      },
    });
  }
}
