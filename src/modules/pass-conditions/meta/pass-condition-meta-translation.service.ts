import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { PassConditionMetaDto } from './dto/pass-condition-meta.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import * as Sentry from '@sentry/node';

@Injectable()
export class PassConditionMetaService {
  constructor(private prisma: PrismaService) {}

  async updatePassConditionMetaTranslation(
    data: PassConditionMetaDto,
  ): Promise<PassConditionMetaDto> {
    try {
      const result = await this.prisma.passConditionMetaTranslation.upsert({
        where: { localeId: data.localeId },
        create: data,
        update: data,
      });

      return plainToClass(PassConditionMetaDto, result);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'pass-condition-meta' }, level: 'error' });
      throw new InternalServerErrorException('Failed to update pass-condition meta translation');
    }
  }
}
