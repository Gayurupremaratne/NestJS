import { BadRequestException } from '@nestjs/common';
import { MAX_STATIC_CONTENT_FILE_SIZE } from '../constants/global.constants';
export function fileSizeValidator(fileSize: number) {
  if (fileSize > MAX_STATIC_CONTENT_FILE_SIZE) {
    throw new BadRequestException('File size exceeds the maximum allowed size.');
  }
}
