import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { StaticContentSignedUrlDto } from '../../../src/modules/static-content/dto/file-signed-url.dto';
import { CONTENT_TYPE_BY_EXTENSION, STATIC_CONTENT_TYPES } from '../constants';

@Injectable()
export class FileUploadValidationPipe implements PipeTransform {
  private validExtensions = STATIC_CONTENT_TYPES.STATIC_MEDIA;

  private contentTypesByExtension = CONTENT_TYPE_BY_EXTENSION; // Define valid content types for each extension in the const file

  transform(value: StaticContentSignedUrlDto) {
    const { fileName, contentType, module } = value;

    if (!fileName || !contentType || !module) {
      throw new BadRequestException('Missing required fields');
    }

    if (!this.isValidExtension(fileName)) {
      throw new BadRequestException('Invalid file extension');
    }

    if (!this.isValidContentType(fileName, contentType)) {
      throw new BadRequestException('Invalid content type for the given extension');
    }

    return value;
  }

  private isValidExtension(filename: string): boolean {
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return this.validExtensions.includes(extension);
  }

  private isValidContentType(filename: string, contentType: string): boolean {
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const validContentTypes = this.contentTypesByExtension[extension];

    return validContentTypes?.includes(contentType);
  }
}
