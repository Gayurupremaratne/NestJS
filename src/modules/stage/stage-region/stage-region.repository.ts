import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { CreateStageRegionDto } from './dto/create-stage-region.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StageRegionRepository {
  constructor(private prisma: PrismaService) {}

  async createStageRegion(
    stageId: string,
    data: CreateStageRegionDto,
  ): Promise<[Prisma.BatchPayload, Prisma.BatchPayload]> {
    const existingRecords = await this.prisma.stageRegion.findMany({
      where: { stageId },
    });
    const existingRegionIds = existingRecords.map((obj) => obj.regionId);

    const newRecordsToAdd = [];
    let recordsToRemove = [];

    data.regionIds.forEach((obj) => {
      if (!existingRegionIds.includes(obj)) {
        newRecordsToAdd.push({ stageId, regionId: obj });
      }
    });

    recordsToRemove = existingRegionIds.filter((obj) => !data.regionIds.includes(obj));

    return await this.prisma.$transaction([
      this.prisma.stageRegion.createMany({
        data: newRecordsToAdd,
      }),
      this.prisma.stageRegion.deleteMany({
        where: {
          regionId: {
            in: recordsToRemove,
          },
          AND: { stageId },
        },
      }),
    ]);
  }
}
