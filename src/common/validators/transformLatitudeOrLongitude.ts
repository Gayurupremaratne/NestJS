import { LATITUDE_REGEX, LONGITUDE_REGEX } from './../constants/global.constants';
import { UnprocessableEntityException } from '@nestjs/common';
import { Transform } from 'class-transformer';

export function TransformLatitude() {
  return Transform(({ value }) => {
    const pattern = LATITUDE_REGEX;
    const isValid = pattern.test(value.toString());

    if (!isValid) {
      throw new UnprocessableEntityException(`latitude is not valid`);
    }

    return value;
  });
}

export function TransformLongitude() {
  return Transform(({ value }) => {
    const pattern = LONGITUDE_REGEX;
    const isValid = pattern.test(value.toString());

    if (!isValid) {
      throw new UnprocessableEntityException(`longitude is not valid`);
    }

    return value;
  });
}
