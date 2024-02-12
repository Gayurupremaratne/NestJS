import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class StaticContentRepository {
  constructor(private prisma: PrismaService) {}

  async createAssetEntry(data: CreateAssetDto): Promise<CreateAssetDto> {
    return await this.prisma.assetKeys.upsert({
      where: { fileKey: data.fileKey },
      update: data,
      create: data,
    });
  }

  async deleteAssetEntry(fileKey: string): Promise<any> {
    return await this.prisma.assetKeys.delete({ where: { fileKey } });
  }
}
