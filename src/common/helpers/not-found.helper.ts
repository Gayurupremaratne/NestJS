import { NotFoundException } from '@nestjs/common';

export const NotFoundHelper = (value: boolean): boolean => {
  if (value === false) {
    throw new NotFoundException();
  }
  return true;
};
