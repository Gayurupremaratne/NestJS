import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { StageTag } from '@prisma/client';
import { StageTagQueryParamDto } from './dto/stage-tag-query-params.dto';
import { parseSortOrder } from '@common/helpers/parse-sort';

@Injectable()
export class StageTagRepository {
  constructor(private prisma: PrismaService) {}

  async getAllTagsEn(queryParams: StageTagQueryParamDto): Promise<PaginatedResult<StageTag[]>> {
    try {
      let whereFilter = {};

      if (queryParams.stages) {
        if (queryParams.stages !== 'all') {
          whereFilter = {
            relatedStages: {
              has: Number(queryParams.stages),
            },
          };
        } else {
          whereFilter = {
            relatedStages: {
              isEmpty: false,
            },
          };
        }
      }

      const paginate: PaginateFunction = paginator({
        perPage: queryParams?.perPage,
      });

      return await paginate(
        this.prisma.stageTagEn,
        {
          where: whereFilter,
          orderBy: parseSortOrder(queryParams.sortBy, 'StageTagEn'),
        },
        {
          page: queryParams.pageNumber,
        },
      );
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getAllTags(
    perPage: number,
    pageNumber: number,
    stages?: string | number,
  ): Promise<PaginatedResult<StageTag[]>> {
    const stageTagFilter = {
      stageTagAssociation: {},
    };

    if (stages) {
      if (stages === 'all') {
        stageTagFilter.stageTagAssociation = {
          some: {},
        };
      }

      const stageNumber = Number(stages);
      if (!isNaN(stageNumber)) {
        stageTagFilter.stageTagAssociation = {
          some: {
            stage: {
              number: stageNumber,
            },
          },
        };
      }
    }
    const paginate: PaginateFunction = paginator({ perPage });
    return await paginate(
      this.prisma.stageTag,
      {
        include: { stageTagAssociation: { include: { stage: true } }, stageTagTranslation: true },
        orderBy: { createdAt: 'desc' },
        where: stageTagFilter,
      },
      {
        page: pageNumber,
      },
    );
  }

  async getStageTag(id: string): Promise<StageTag | null> {
    const stageTag = await this.prisma.stageTag.findFirst({
      where: { id },
      include: { stageTagAssociation: { include: { stage: true } }, stageTagTranslation: true },
    });
    if (!stageTag) throw new NotFoundException('Stage tag not found');
    return stageTag;
  }

  async createStageTag(): Promise<StageTag> {
    return await this.prisma.stageTag.create({ data: {} });
  }

  async updateStageTag(id: string): Promise<StageTag> {
    return await this.prisma.stageTag.update({
      where: { id },
      data: {},
    });
  }

  async deleteStageTag(id: string): Promise<string> {
    const deletedStageTag = await this.prisma.stageTag.delete({ where: { id } });
    return deletedStageTag.id;
  }
}
