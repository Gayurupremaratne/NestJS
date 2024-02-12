import { Module } from '@nestjs/common';
import { StaticContentService } from './static-content.service';
import { StaticContentController } from './static-content.controller';
import { StaticContentRepository } from './static-content.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [StaticContentController],
  providers: [StaticContentService, StaticContentRepository, PrismaService],
})
export class StaticContentModule {}
