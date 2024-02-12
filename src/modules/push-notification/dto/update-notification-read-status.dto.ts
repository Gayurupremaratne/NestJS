import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class UpdateNotificationReadStatusDto {
  @ApiProperty()
  @IsArray()
  notificationIds: string[];
}
