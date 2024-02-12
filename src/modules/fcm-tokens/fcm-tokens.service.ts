import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateFcmTokenDto } from './dto/create-fcm-token.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import { FcmTokenDto } from './dto/fcm-token.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class FcmTokensService {
  constructor(private prismaService: PrismaService) {}

  async createFcmToken(userId: string, createFcmTokenDto: CreateFcmTokenDto): Promise<FcmTokenDto> {
    const token = await this.prismaService.fcmToken.findFirst({
      where: {
        deviceToken: createFcmTokenDto.deviceToken,
      },
    });

    try {
      if (token) {
        return await this.updateFcmToken(userId, createFcmTokenDto, token.id);
      } else {
        return await this.prismaService.fcmToken.create({
          data: {
            ...createFcmTokenDto,
            userId: userId,
          },
        });
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'fcm-tokens' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async updateFcmToken(
    userId: string,
    updateFcmTokenDto: CreateFcmTokenDto,
    tokenId: string,
  ): Promise<FcmTokenDto> {
    return await this.prismaService.fcmToken.update({
      where: {
        id: tokenId,
      },
      data: {
        ...updateFcmTokenDto,
        userId: userId,
      },
    });
  }

  async getFcmTokensByUserId(userId: string): Promise<FcmTokenDto[]> {
    try {
      return await this.prismaService.fcmToken.findMany({
        where: {
          userId: userId,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'fcm-tokens' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async removeAllFcmTokensByUserId(userId: string) {
    try {
      return await this.prismaService.fcmToken.deleteMany({
        where: {
          userId: userId,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'fcm-tokens' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
