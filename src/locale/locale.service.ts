import { Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocaleService {
  constructor(private prismaService: PrismaService) {}

  async getAllLocales(): Promise<Locale[]> {
    return await this.prismaService.locale.findMany();
  }
}
