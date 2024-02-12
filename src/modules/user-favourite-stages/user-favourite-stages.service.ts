import { Injectable } from '@nestjs/common';
import { UserFavouriteStageDto } from './dto/user-favourite-stage.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PaginateFunction, paginator } from '@common/helpers';

@Injectable()
export class UserFavouriteStagesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getFavoriteStagesOfLoggedUser(perPage: number, pageNumber: number, userId: string) {
    const paginate: PaginateFunction = paginator({ perPage });
    return paginate(
      this.prismaService.userFavouriteStage,
      {
        include: {
          stage: {
            include: {
              stagesTranslation: true,
              stageRegion: {
                include: {
                  region: {
                    include: {
                      regionTranslation: true,
                    },
                  },
                },
              },
              stageMedia: {
                take: 1,
                where: {
                  mediaType: 'MAIN_IMAGE',
                },
              },
            },
          },
        },
        where: {
          userId,
          stage: {
            open: {
              equals: true,
            },
          },
        },
      },
      {
        page: pageNumber,
      },
    );
  }

  async createFavouriteStage(userFavouriteStageDto: UserFavouriteStageDto, userId: string) {
    const createdFavouriteStage = await this.prismaService.userFavouriteStage.create({
      data: {
        userId: userId,
        stageId: userFavouriteStageDto.stageId,
      },
    });
    return createdFavouriteStage;
  }

  async deleteFavouriteStage(userFavouriteStageDto: UserFavouriteStageDto, userId: string) {
    const deletedFavouriteStage = await this.prismaService.userFavouriteStage.delete({
      where: {
        userId_stageId: {
          userId: userId,
          stageId: userFavouriteStageDto.stageId,
        },
      },
    });
    return deletedFavouriteStage;
  }
}
