import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateStageMediaDto } from './dto/create-stage-media.dto';
import { UpdateStageMediaDto } from './dto/update-stage-media.dto';
import { StageMediaDto } from './dto/stage-media.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StageMediaUpdateReqParamDto } from './dto/stage-media-update-req-params.dto';
import { PaginateFunction, PaginatedResult, paginator } from '@common/helpers/paginator';
import * as Sentry from '@sentry/node';

@Injectable()
export class StageMediaService {
  constructor(private prismaService: PrismaService) {}
  async create(createStageMediaDto: CreateStageMediaDto): Promise<StageMediaDto> {
    try {
      const createdStageMedia = await this.prismaService.stageMedia.create({
        data: createStageMediaDto,
      });
      return createdStageMedia;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-media' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async createBulk(createStageMediaDto: CreateStageMediaDto[]): Promise<Prisma.BatchPayload> {
    try {
      const createdStageMedia = await this.prismaService.stageMedia.createMany({
        data: createStageMediaDto,
      });
      return createdStageMedia;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-media' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAllByStageId(
    id: string,
    isAdmin: string,
    perPage: number,
    pageNumber: number,
  ): Promise<PaginatedResult<StageMediaDto[]>> {
    try {
      const paginate: PaginateFunction = paginator({ perPage });
      const filters = isAdmin
        ? {
            stageId: id,
            mediaType: { in: ['MAIN_IMAGE', 'SUPPLIMENTARY_IMAGE', 'ELEVATION_GRAPH_IMAGE'] },
          }
        : { stageId: id, mediaType: 'HIKER_IMAGE' };

      return await paginate(
        this.prismaService.stageMedia,
        {
          where: filters,
        },
        {
          page: pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-media' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(
    reqParams: StageMediaUpdateReqParamDto,
    updateStageMediaDto: UpdateStageMediaDto,
  ): Promise<StageMediaDto> {
    try {
      const isUpdated = await this.prismaService.stageMedia.update({
        where: { id: reqParams.mediaId, stageId: reqParams.stageId },
        data: updateStageMediaDto,
      });

      return isUpdated;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-media' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string): Promise<StageMediaDto> {
    try {
      const deleatedObject: StageMediaDto = await this.prismaService.stageMedia.delete({
        where: { id },
      });
      return deleatedObject;
    } catch (error) {}
  }

  async getMyStageMedia(
    stageId: string,
    userId: string,
    perPage: number,
    pageNumber: number,
  ): Promise<PaginatedResult<StageMediaDto[]>> {
    try {
      const paginate: PaginateFunction = paginator({ perPage });
      return await paginate(
        this.prismaService.stageMedia,
        {
          where: { stageId: stageId, userId: userId },
          orderBy: { createdAt: 'desc' },
        },
        {
          page: pageNumber,
        },
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-media' }, level: 'error' });
      throw new InternalServerErrorException(error.message);
    }
  }
}
