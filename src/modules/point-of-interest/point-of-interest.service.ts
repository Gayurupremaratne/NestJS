import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { StaticContentService } from '../static-content/static-content.service';
import { CreatePointOfInterestDto } from './dto/create-poi.dto';
import { GetPoiDto, GetPoiPaginationDto } from './dto/get-poi.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';
import { parseSortOrder } from '@common/helpers/parse-sort';
import * as Sentry from '@sentry/node';

@Injectable()
export class PointOfInterestService {
  constructor(
    private readonly prisma: PrismaService,
    private staticContentService: StaticContentService,
  ) {}

  /*  Create Point of interest
   *  @params CreatePointOfInterestDto
   *  @response GetPoiDto
   */
  async createPointOfInterest(data: CreatePointOfInterestDto): Promise<GetPoiDto> {
    try {
      const poiCreateOption = {
        data: {
          longitude: data.longitude,
          latitude: data.latitude,
          mediaKey: data.assetKey,
          pointOfInterestTranslation: {
            createMany: {
              data: data.pointOfInterestTranslations,
            },
          },
        },
      };

      if (data?.stageIds?.length > 0) {
        poiCreateOption.data['pointOfInterestStage'] = {
          createMany: {
            data: data?.stageIds?.map((id) => {
              return { stageId: id };
            }),
          },
        };
      }
      const createdPointOfInterest = await this.prisma.pointOfInterest.create(poiCreateOption);

      return await this.getPointOfInterestById(createdPointOfInterest.id);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException('Create Point Of Interest Failed');
    }
  }

  /*  Update Point of interest
   *  @params id, CreatePointOfInterestDto
   *  @response GetPoiDto
   */
  async updatePointOfInterest(id: string, data: CreatePointOfInterestDto): Promise<UpdatePoiDto> {
    try {
      let updatedPoi: GetPoiDto;
      let mediaKeyToDelete: string;

      const oldPoi = await this.prisma.pointOfInterest.findFirst({
        where: {
          id: id,
        },
        include: { pointOfInterestStage: true },
      });

      const oldStageIds = oldPoi.pointOfInterestStage.map((o) => o.stageId);

      let stageToDisconnect = oldStageIds;

      if (data?.stageIds && data.stageIds.length > 0) {
        stageToDisconnect = stageToDisconnect.filter((key) => !data.stageIds.includes(key));
      }

      const stageToDisconnectObjects = stageToDisconnect.map((id) => ({ stageId: id }));
      const stageToConnectObjects = (data?.stageIds || [])
        .filter((key) => !oldStageIds.includes(key))
        .map((id) => ({ stageId: id }));

      const updatedPoiTranslations = await this.prisma.$transaction(async (tx) => {
        updatedPoi = await tx.pointOfInterest.update({
          where: { id },
          data: {
            longitude: data.longitude,
            latitude: data.latitude,
            mediaKey: data.assetKey,
            pointOfInterestStage: {
              createMany: { data: stageToConnectObjects },
              deleteMany: stageToDisconnectObjects,
            },
          },
        });

        const updatedPoiTranslationsData = await Promise.all(
          data.pointOfInterestTranslations.map(async (t) => {
            const translationData = {
              pointOfInterestId: id,
              localeId: t.localeId,
              title: t.title,
              description: t.description,
            };

            return await tx.pointOfInterestTranslation.upsert({
              where: {
                pointOfInterestId_localeId: {
                  pointOfInterestId: id,
                  localeId: t.localeId,
                },
              },
              create: translationData,
              update: translationData,
            });
          }),
        );

        if (oldPoi.mediaKey && oldPoi.mediaKey !== updatedPoi.mediaKey) {
          mediaKeyToDelete = oldPoi.mediaKey;
          await tx.assetKeys.delete({
            where: {
              fileKey: mediaKeyToDelete,
            },
          });
        }

        return updatedPoiTranslationsData;
      });

      if (mediaKeyToDelete) {
        this.staticContentService.s3DeleteObjects([mediaKeyToDelete]);
      }

      return {
        updatedPoi,
        updatedPoiTranslations,
      };
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException('Point Of Interest Update Failed');
    }
  }

  /**
   *  Get Point Of Interest By Id
   *  @params id
   *  @response GetPoiDto
   */
  async getPointOfInterestById(id: string): Promise<GetPoiDto> {
    try {
      return await this.prisma.pointOfInterest.findFirst({
        where: { id },
        include: {
          pointOfInterestTranslation: true,
          pointOfInterestStage: {
            include: {
              stage: {
                include: {
                  usersFavouriteStage: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get All Point Of Interest By stageId
   *  @params id, quey?
   *  @response PaginatedResult || GetPoiDto
   */
  async getPointOfInterestByStageId(
    stageId: string,
    query?: GetPoiPaginationDto,
  ): Promise<GetPoiDto[] | PaginatedResult<GetPoiDto>> {
    try {
      if (query?.pageNumber) {
        return await this.getPaginatedPointOfInterestByStageId(stageId, query);
      } else {
        return await this.prisma.pointOfInterest.findMany({
          where: {
            pointOfInterestStage: {
              some: {
                stageId: stageId,
              },
            },
          },
          include: {
            pointOfInterestTranslation: true,
            pointOfInterestStage: {
              select: {
                pointOfInterestId: true,
                stageId: true,
                stage: {
                  include: {
                    stagesTranslation: true,
                    usersFavouriteStage: true,
                  },
                },
              },
            },
          },
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get Paginated Point Of Interest By stageId
   *  @params stageId, query
   *  @response PaginatedResult
   */
  async getPaginatedPointOfInterestByStageId(
    stageId: string,
    query: GetPoiPaginationDto,
  ): Promise<PaginatedResult<GetPoiDto>> {
    try {
      const paginate: PaginateFunction = paginator({
        perPage: query?.perPage,
      });

      return await paginate(
        this.prisma.pointOfInterest,
        {
          include: {
            pointOfInterestStage: {
              select: {
                pointOfInterestId: true,
                stageId: true,
                stage: {
                  include: {
                    stagesTranslation: true,
                    usersFavouriteStage: true,
                  },
                },
              },
            },
            pointOfInterestTranslation: true,
          },
          where: {
            pointOfInterestTranslation: {
              some: {
                title: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
            pointOfInterestStage: {
              some: {
                stageId: {
                  equals: stageId,
                },
              },
            },
          },
        },
        {
          page: query.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get All Point Of Interest
   *  @params GetPoiPaginationDto
   *  @response PaginatedResult
   */
  async getAllPointOfInterest(query: GetPoiPaginationDto): Promise<PaginatedResult<GetPoiDto>> {
    try {
      const paginate: PaginateFunction = paginator({
        perPage: query?.perPage,
      });

      const includeOptions: { [key: string]: object | string | boolean } = {
        pointOfInterestTranslation: true,
        pointOfInterestStage: {
          include: {
            stage: true,
          },
        },
      };

      const orderByOption = {};

      if (query.orderBy && query.orderBy.length > 0) {
        query.orderBy.forEach((o) => {
          switch (o.field) {
            case 'title':
              includeOptions['pointOfInterestTranslation'] = {
                orderBy: {
                  title: o.sortBy,
                },
              };
              break;
            case 'number':
              includeOptions['pointOfInterestStage'] = {
                include: {
                  stage: true,
                },
                orderBy: {
                  stage: {
                    number: o.sortBy,
                  },
                },
              };
              break;
          }
        });
      } else {
        orderByOption['createdAt'] = 'desc';
      }

      return await paginate(
        this.prisma.pointOfInterest,
        {
          include: includeOptions,
          orderBy: orderByOption,
          where: {
            pointOfInterestTranslation: {
              some: {
                title: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          page: query.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async getAllPointOfInterestEn(query: GetPoiPaginationDto): Promise<PaginatedResult<GetPoiDto>> {
    try {
      const paginate: PaginateFunction = paginator({
        perPage: query?.perPage,
      });
      return await paginate(
        this.prisma.pointOfInterestEn,
        {
          where: {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          orderBy: parseSortOrder(query.sortBy, 'PointOfInterestEn'),
        },
        {
          page: query.pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get 10 Points Of Interest randomly
   *  @response GetPoiDto
   */
  async getRandomPointsOfInterest(count: number = 10): Promise<GetPoiDto[]> {
    try {
      const randomPointOfInterestsIds = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT
          poi.id
        FROM point_of_interest poi
        GROUP BY poi.id
        ORDER BY RANDOM()
        LIMIT ${count};
      `;
      const poiIds = randomPointOfInterestsIds.map((obj) => obj.id);
      const randomPOIs = await this.prisma.pointOfInterest.findMany({
        where: {
          id: { in: poiIds },
        },
        include: {
          pointOfInterestTranslation: true,
          pointOfInterestStage: {
            include: {
              stage: {
                include: {
                  stagesTranslation: true,
                  usersFavouriteStage: true,
                  stageMedia: {
                    where: {
                      mediaType: 'MAIN_IMAGE',
                    },
                    select: {
                      mediaKey: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      return randomPOIs;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Delete Point Of Interest
   *  @params id
   *  @response void
   */
  async deletePointOfInterest(id: string): Promise<void> {
    try {
      let deletedPointOfInterest: GetPoiDto;
      await this.prisma.$transaction(async (tx) => {
        deletedPointOfInterest = await tx.pointOfInterest.delete({
          where: { id },
        });

        if (deletedPointOfInterest.mediaKey !== null) {
          await tx.assetKeys.delete({
            where: {
              fileKey: deletedPointOfInterest.mediaKey,
            },
          });
        }
      });
      if (deletedPointOfInterest.mediaKey !== null) {
        this.staticContentService.s3DeleteObjects([deletedPointOfInterest.mediaKey]);
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'point-of-interest' }, level: 'error' });
      throw new InternalServerErrorException('Delete Point Of Interest Failed');
    }
  }
}
