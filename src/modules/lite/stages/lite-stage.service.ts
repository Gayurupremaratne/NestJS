import { Injectable } from '@nestjs/common';
import { GetAllStagesDropDownDto } from './dto/dropdown-stage.dto';
import { LiteStageRepository } from './lite-stage.repository';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class LiteStageService {
  constructor(private liteStageRepository: LiteStageRepository) {}

  async getAllForDropdown(): Promise<GetAllStagesDropDownDto[]> {
    return plainToInstance(
      GetAllStagesDropDownDto,
      await this.liteStageRepository.getAllForDropdown(),
    );
  }
}
