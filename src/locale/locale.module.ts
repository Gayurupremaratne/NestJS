import { Module } from '@nestjs/common';
import { LocaleService } from './locale.service';
import { LocaleController } from './locale.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [LocaleService, PrismaService],
  controllers: [LocaleController],
})
export class LocaleModule {}
