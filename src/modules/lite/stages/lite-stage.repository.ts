import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Stage } from '@prisma/client';

@Injectable()
export class LiteStageRepository {
  constructor(private prisma: PrismaService) {}

  async getAllForDropdown(): Promise<Pick<Stage, 'id' | 'number'>[]> {
    return await this.prisma.stage.findMany({
      select: {
        id: true,
        number: true,
        stagesTranslation: true,
      },
      orderBy: {
        number: 'asc',
      },
    });
  }
}
