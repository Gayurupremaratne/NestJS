import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateStoryDto } from './dto/create-story.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import { GetAllStoryDto, GetStoryDataDto } from './dto/get-story.dto';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import {
  CreateStoryConsumptionDto,
  StoryConsumptionResponseDto,
} from './dto/create-story-consumptio.dto';
import { CONSUMPTION_STATUS, STAGE_STORY_CONSUMPTION_STATUS } from '@common/constants';
import { StaticContentService } from '../static-content/static-content.service';
import { CreateStoryTranslations } from './dto/story-translation.dto';
import { parseSortOrder } from '@common/helpers/parse-sort';
import * as Sentry from '@sentry/node';

@Injectable()
export class StoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staticContentService: StaticContentService,
  ) {}

  /**
   *  Create Story
   *  @params CreateStoryDto
   *  @response Prisma.StageStoryCreateInput
   */
  async createStory(data: CreateStoryDto): Promise<GetStoryDataDto> {
    try {
      const createdStory = await this.prisma.stageStory.create({
        data: {
          longitude: data.longitude,
          latitude: data.latitude,
          stageId: data.stageId,
          stageStoryTranslations: {
            createMany: {
              data: data.stageStoryTranslations,
            },
          },
        },
      });
      return await this.getStory(createdStory.id);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException('Create Trail Story Failed');
    }
  }

  /**
   *  Update Story
   *  @params CreateStoryDto
   *  @response Prisma.StageStoryUpdateInput
   */
  async updateStory(
    id: string,
    data: CreateStoryDto,
  ): Promise<{
    updatedStory: Partial<CreateStoryDto>;
    updatedStoryTranslations: CreateStoryTranslations[];
  }> {
    try {
      let updatedStory: Partial<CreateStoryDto>;
      let audioKeysToDelete: string[];
      const oldTranslations = await this.prisma.stageStoryTranslations.findMany({
        where: {
          stageStoryId: id,
        },
        select: {
          audioKey: true,
        },
      });

      const updatedStoryTranslations = await this.prisma.$transaction(async (tx) => {
        const updatedFields = {
          longitude: data.longitude,
          latitude: data.latitude,
          stageId: data?.stageId ? data?.stageId : null,
        };

        updatedStory = await tx.stageStory.update({
          where: { id },
          data: updatedFields,
        });

        const updatedStoryTranslationsData = await Promise.all(
          data.stageStoryTranslations.map(async (t) => {
            const translationData = {
              stageStoryId: id,
              localeId: t.localeId,
              audioKey: t.audioKey,
              title: t.title,
              description: t.description,
            };

            return await tx.stageStoryTranslations.upsert({
              where: {
                stageStoryId_localeId: {
                  stageStoryId: id,
                  localeId: t.localeId,
                },
              },
              create: translationData,
              update: translationData,
            });
          }),
        );

        const oldAudioKeys = oldTranslations.map((t) => t.audioKey);
        const newAudioKeys = data.stageStoryTranslations.map((t) => t.audioKey);
        audioKeysToDelete = oldAudioKeys.filter((key) => !newAudioKeys.includes(key));

        if (audioKeysToDelete.length > 0) {
          await tx.stageStoryTranslations.deleteMany({
            where: {
              stageStoryId: id,
              audioKey: {
                in: audioKeysToDelete,
              },
            },
          });
        }

        return updatedStoryTranslationsData;
      });

      // separated s3 delete asset delete due to transaction timeout limit(5000ms)
      if (audioKeysToDelete.length > 0) {
        await this.prisma.assetKeys.deleteMany({
          where: {
            fileKey: {
              in: audioKeysToDelete,
            },
          },
        });
        this.staticContentService.s3DeleteObjects(audioKeysToDelete);
      }

      return {
        updatedStory,
        updatedStoryTranslations,
      };
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException('Update Trail Story Failed');
    }
  }

  /**
   *  Delete Story
   *  @params id
   *  @response void
   */
  async deleteStory(id: string): Promise<void> {
    try {
      let translationsAudioKeys: string[];
      await this.prisma.$transaction(async (tx) => {
        const translationsAudio = await tx.stageStoryTranslations.findMany({
          where: {
            stageStoryId: id,
          },
          select: {
            audioKey: true,
          },
        });
        translationsAudioKeys = translationsAudio.map((t) => t.audioKey);

        await tx.stageStory.delete({
          where: { id },
        });

        if (translationsAudioKeys.length > 0) {
          await tx.assetKeys.deleteMany({
            where: {
              fileKey: {
                in: translationsAudioKeys,
              },
            },
          });
        }
      });
      // separated s3 delete due to transaction timeout limit(5000ms)
      if (translationsAudioKeys.length > 0) {
        this.staticContentService.s3DeleteObjects(translationsAudioKeys);
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException('Delete Trail Story Failed');
    }
  }

  /**
   *  Get Story
   *  @params id
   *  @response void
   */
  async getStory(id: string): Promise<GetStoryDataDto> {
    try {
      return await this.prisma.stageStory.findFirst({
        where: { id },
        include: { stageStoryTranslations: true, stage: true },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get All Story
   *  @params GetAllStoryDto
   *  @response GetStoryDataDto[]
   */

  async getAllStory(data: GetAllStoryDto): Promise<PaginatedResult<GetStoryDataDto>> {
    try {
      const paginate: PaginateFunction = paginator({
        perPage: data?.perPage,
      });

      const orderByOption = {};

      const includeOptions = {
        stage: true,
      };

      if (data.orderBy && data.orderBy.length > 0) {
        data.orderBy.forEach((o) => {
          switch (o.field) {
            case 'title':
              includeOptions['stageStoryTranslations'] = {
                orderBy: { title: o.sortBy },
              };
              break;
            case 'number':
              orderByOption['stage'] = {
                number: o.sortBy,
              };
              includeOptions['stageStoryTranslations'] = true;
              break;
          }
        });
      } else {
        includeOptions['stageStoryTranslations'] = true;
        orderByOption['createdAt'] = 'desc';
      }

      return await paginate(
        this.prisma.stageStory,
        {
          include: includeOptions,
          orderBy: orderByOption,
          where: {
            stageStoryTranslations: {
              some: {
                title: {
                  contains: data.search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          page: data.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get All Story En
   *  @params GetAllStoryDto
   *  @response GetStoryDataDto[]
   */

  async getAllStoryEn(data: GetAllStoryDto): Promise<PaginatedResult<GetStoryDataDto>> {
    try {
      const paginate: PaginateFunction = paginator({
        perPage: data?.perPage,
      });

      return await paginate(
        this.prisma.stageStoryEn,
        {
          where: {
            title: {
              contains: data.search,
              mode: 'insensitive',
            },
          },
          orderBy: parseSortOrder(data.sortBy, 'StageStoryEn'),
        },
        {
          page: data.pageNumber,
        },
      );
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Create/ Update Story Consumption
   *  @params stageStoryId
   *  @params userId
   *  @param  CreateStoryConsumptionDto
   *  @response StoryConsumptionResponseDto
   */

  async upsertStoryConsumption(
    stageStoryId: string,
    userId: string,
    data: CreateStoryConsumptionDto,
  ): Promise<StoryConsumptionResponseDto> {
    try {
      const consumption = {
        status: data.status,
        userId,
        stageStoryId,
        timestamp:
          data.status === STAGE_STORY_CONSUMPTION_STATUS[CONSUMPTION_STATUS.PAUSED]
            ? data.timestamp
            : null,
      };
      return await this.prisma.stageStoryConsumption.upsert({
        where: {
          stageStoryId_userId: {
            stageStoryId,
            userId,
          },
        },
        create: consumption,
        update: consumption,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException('Story Consumption Update Failed');
    }
  }

  /**
   *  Get Stage By Story Consumption
   *  @params stageId
   *  @response GetStoryDataDto[]
   */

  async getStoryByStage(stageId: string): Promise<GetStoryDataDto[]> {
    try {
      return await this.prisma.stageStory.findMany({
        where: {
          stageId,
        },
        include: { stageStoryTranslations: true, stage: true },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'story' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
