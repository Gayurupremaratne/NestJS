import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UpdateStageTagTranslationDto } from './dto/update-stage-tag-translation.dto';
import { StageTagTranslation } from '@prisma/client';
import * as Sentry from '@sentry/node';

@Injectable()
export class StageTagTranslationRepository {
  constructor(private prismaService: PrismaService) {}

  async updateStageTagTranslation(
    stageTagId: string,
    localeId: string,
    data: UpdateStageTagTranslationDto,
  ): Promise<StageTagTranslation> {
    try {
      return await this.prismaService.stageTagTranslation.upsert({
        where: {
          stageTagId_localeId: {
            stageTagId,
            localeId,
          },
        },
        update: data,
        create: {
          ...data,
          stageTagId,
          localeId,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-tag-translation' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
