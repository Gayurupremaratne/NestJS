import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { OnboardingMetaDto } from './dto/onboarding-meta.dto';
import { PrismaService } from '@prisma-orm/prisma.service';

@Injectable()
export class OnboardingGuidelineMetaService {
  constructor(private prisma: PrismaService) {}

  async updateOnboardingMetaTranslation(data: OnboardingMetaDto): Promise<OnboardingMetaDto> {
    try {
      const result = await this.prisma.onboardingMetaTranslation.upsert({
        where: { localeId: data.localeId },
        create: data,
        update: data,
      });

      return plainToClass(OnboardingMetaDto, result);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update onboarding meta translation');
    }
  }
}
