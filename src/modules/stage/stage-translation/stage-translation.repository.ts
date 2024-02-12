import { PrismaService } from '@prisma-orm/prisma.service';
import { StageTranslation } from '@prisma/client';
import { UpdateStageTranslationDto } from './dto/update-stage-translation.dto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class StageTranslationRepository {
  constructor(private prisma: PrismaService) {}

  async updateStageTranslation(data: UpdateStageTranslationDto): Promise<StageTranslation> {
    try {
      return await this.prisma.stageTranslation.upsert({
        where: {
          stageId_localeId: {
            localeId: data.localeId,
            stageId: data.stageId,
          },
        },
        update: data,
        create: data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage-translation' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
