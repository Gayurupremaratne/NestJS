import { CreateAssetDto } from '@app/modules/static-content/dto/create-asset.dto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MockStaticContentRepository {
  constructor(private prisma: PrismaService) {}

  async createAssetEntry(data: CreateAssetDto): Promise<CreateAssetDto> {
    return data;
  }

  async deleteAssetEntry(id: string): Promise<any> {
    return id;
  }
}
