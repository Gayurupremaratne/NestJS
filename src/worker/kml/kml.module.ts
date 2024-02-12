import { Module } from '@nestjs/common';
import { KmlService } from './kml.consumer';
import { KmlController } from './kml.producer';
import { BullModule } from '@nestjs/bull';
import { StaticContentService } from '../../modules/static-content/static-content.service';
import { ConfigService } from '@nestjs/config';
import { StaticContentRepository } from '../../modules/static-content/static-content.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { MulterModule } from '@nestjs/platform-express';
import { KmlRepository } from './kml.repository';
import { PointOfInterestService } from '../../modules/point-of-interest/point-of-interest.service';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'kml',
    }),
    MulterModule.register({
      dest: `${process.cwd()}/src/worker/temp`, // Specify a temporary directory for uploaded files
    }),
  ],
  controllers: [KmlController],
  providers: [
    KmlService,
    StaticContentService,
    ConfigService,
    StaticContentRepository,
    PrismaService,
    KmlRepository,
    PointOfInterestService,
  ],
})
export class KmlModule {}
