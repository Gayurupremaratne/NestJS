import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { OnboardingGuidelineTranslation, Prisma } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { GuidelineTranslationParamDto } from './dto/onboarding-guideline-param.dto';
import { OnboardingGuidelineResponse } from './dto/onboarding-guideline-response.dto';
import { OnboardingGuidelineTranslationResponse } from './dto/onboarding-guideline.dto';
import { UpsertGuidelineTranslationDto } from './dto/upsert-guideline-translation.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class OnboardingGuidelineService {
  constructor(private prisma: PrismaService) {}

  async getAllGuidelineTranslations(): Promise<OnboardingGuidelineResponse> {
    try {
      const onboardingGuidelines = await this.prisma.onboardingGuidelineTranslation.findMany({
        orderBy: { order: 'asc' },
      });

      const metaTranslations = await this.prisma.onboardingMetaTranslation.findMany({});

      return {
        metaTranslations,
        onboardingGuidelines,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve onboarding guidelines');
    }
  }

  async upsertGuidelineTranslation(
    guidelineTranslations: UpsertGuidelineTranslationDto[],
  ): Promise<OnboardingGuidelineTranslation[]> {
    try {
      return await this.prisma.$transaction(
        guidelineTranslations.map((onboardingGuideline) =>
          this.prisma.onboardingGuidelineTranslation.upsert({
            where: {
              order_localeId: {
                order: onboardingGuideline.order,
                localeId: onboardingGuideline.localeId,
              },
            },
            create: onboardingGuideline,
            update: onboardingGuideline,
          }),
        ),
      );
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'onboarding-guideline' }, level: 'error' });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2022: Unique constraint failed
        if (error.code === 'P2002') {
          throw new ConflictException(
            `${error.meta.target.toString()} property should contain unique values`,
          );
        }
      }
      throw new InternalServerErrorException('Failed to upsert onboarding guideline');
    }
  }

  async getGuidelinesByLocaleAndOrder(
    locale: string,
    order: number,
  ): Promise<OnboardingGuidelineTranslation[]> {
    return await this.prisma.onboardingGuidelineTranslation.findMany({
      where: {
        localeId: locale,
        order: { gt: order },
      },
    });
  }

  async removeGuidelineTranslation(
    params: GuidelineTranslationParamDto,
  ): Promise<OnboardingGuidelineTranslationResponse> {
    try {
      let deletedTranslation: OnboardingGuidelineTranslation;

      const guidelineTranslation = this.prisma.onboardingGuidelineTranslation.findUnique({
        where: { order_localeId: { order: params.order, localeId: params.localeId } },
      });

      if (!guidelineTranslation) throw new NotFoundException();

      await this.prisma.$transaction(async (tx) => {
        deletedTranslation = await tx.onboardingGuidelineTranslation.delete({
          where: { order_localeId: { order: params.order, localeId: params.localeId } },
        });

        //get guidelines need to update order
        const guidelinesNeedToUpdateOrders = await this.getGuidelinesByLocaleAndOrder(
          deletedTranslation.localeId,
          deletedTranslation.order,
        );

        //update guideline order
        if (guidelinesNeedToUpdateOrders.length > 0) {
          await Promise.all(
            guidelinesNeedToUpdateOrders.map((guideline) =>
              tx.onboardingGuidelineTranslation.update({
                where: { order_localeId: { order: guideline.order, localeId: guideline.localeId } },
                data: { order: guideline.order - 1 },
              }),
            ),
          );
        }
      });

      return plainToClass(OnboardingGuidelineTranslationResponse, deletedTranslation);
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'onboarding-guideline' }, level: 'error' });
      throw new InternalServerErrorException('Failed to delete onboarding guideline');
    }
  }
}
