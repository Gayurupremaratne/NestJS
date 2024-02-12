import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UpsertTranslationDto } from '@policies/dto/upsert-translation.dto';
import { UpsertTranslationQueryDto } from '@policies/dto/upsert-translation-query.dto';

@Injectable()
export class TranslationsService {
  constructor(private prismaService: PrismaService) {}

  async upsert(upsertTranslation: UpsertTranslationDto & UpsertTranslationQueryDto) {
    const { policyId, localeId, ...data } = upsertTranslation;

    try {
      return await this.prismaService.policyTranslations.upsert({
        where: {
          policyId_localeId: {
            policyId,
            localeId,
          },
        },
        update: data,
        create: {
          ...data,
          policyId,
          localeId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
