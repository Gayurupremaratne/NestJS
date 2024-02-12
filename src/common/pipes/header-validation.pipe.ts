import { PLATFORM } from '@common/constants';
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class HeaderValidationPipe implements PipeTransform {
  transform(request) {
    if (request['headers']) {
      if (!request['headers']['platform']) {
        throw new BadRequestException(`platform header is required`);
      }

      const platform = request['headers']['platform'];

      const isIncludes = [PLATFORM.web, PLATFORM.mobile].includes(platform);

      if (!isIncludes) {
        throw new BadRequestException(`platform header is not valid`);
      }
    }

    return request;
  }
}
