import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { LiteStageService } from './lite-stage.service';
import { LiteStageRepository } from './lite-stage.repository';
import { LiteStageController } from './lite-stage.controller';

@Module({
  controllers: [LiteStageController],
  providers: [LiteStageService, PrismaService, LiteStageRepository],
})
export class LiteStageModule {}
