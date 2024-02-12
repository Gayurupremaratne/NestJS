import { Injectable } from '@nestjs/common';
import { RegionDto } from './dto/region.dto';
import { plainToInstance } from 'class-transformer';
import { RegionRepository } from './region.repository';

@Injectable()
export class RegionService {
  constructor(private regionsRepository: RegionRepository) {}

  async getAllRegions(): Promise<RegionDto[]> {
    return plainToInstance(RegionDto, await this.regionsRepository.getAllRegions());
  }
}
