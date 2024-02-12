import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Prisma, StageTagAssociation } from '@prisma/client';
import { UpdateStageTagAssociationDto } from './dto/update-stage-tag-association.dto';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import * as Sentry from '@sentry/node';

@Injectable()
export class StageTagAssociationRepository {
  constructor(private prisma: PrismaService) {}

  async getStageTagAssociation(
    stageTagId: string,
    perPage: number,
    pageNumber: number,
  ): Promise<PaginatedResult<StageTagAssociation[]>> {
    const paginate: PaginateFunction = paginator({ perPage });
    return paginate(
      this.prisma.stageTagAssociation,
      {
        where: { stageTagId },
        include: { stageTag: true, stage: true },
      },
      {
        page: pageNumber,
      },
    );
  }

  async updateStageTagAssociation(
    stageTagId: string,
    data: UpdateStageTagAssociationDto,
  ): Promise<[Prisma.BatchPayload, Prisma.BatchPayload]> {
    try {
      const existingRecords = await this.prisma.stageTagAssociation.findMany({
        where: { stageTagId },
      });
      const existingStageIds = existingRecords.map((obj) => obj.stageId);

      const newRecordsToAdd = [];
      let recordsToRemove = [];

      data.stageIds.forEach((obj) => {
        if (!existingStageIds.includes(obj)) {
          newRecordsToAdd.push({ stageTagId, stageId: obj });
        }
      });

      recordsToRemove = existingStageIds.filter((obj) => !data.stageIds.includes(obj));

      return await this.prisma.$transaction([
        this.prisma.stageTagAssociation.createMany({
          data: newRecordsToAdd,
        }),
        this.prisma.stageTagAssociation.deleteMany({
          where: {
            stageId: {
              in: recordsToRemove,
            },
            AND: { stageTagId },
          },
        }),
      ]);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-tag-association' }, level: 'error' });
      throw new InternalServerErrorException('Failed to update stage tag association');
    }
  }
}
