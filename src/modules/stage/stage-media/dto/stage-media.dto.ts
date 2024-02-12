import { Optional } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';

export class StageMediaDto {
  userId: string;

  @Optional()
  @IsEnum($Enums.STAGE_MEDIA_TYPES)
  type?: $Enums.STAGE_MEDIA_TYPES;

  @IsEnum($Enums.STAGE_MEDIA_KEY_TYPES)
  mediaType: $Enums.STAGE_MEDIA_KEY_TYPES;

  latitude?: number;

  longitude?: number;

  createdAt?: string | Date;

  @Exclude()
  updatedAt?: string | Date;

  id?: string;

  @Exclude({ toClassOnly: true })
  stageId?: string;

  @Optional()
  @IsString()
  mediaKey: string;
}
