import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { StaticContentService } from './static-content.service';
import { StaticContentSignedUrlDto } from './dto/file-signed-url.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response-dto';
import { FileUploadValidationPipe } from '@common/pipes/file-upload.pipe';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('static-content')
@ApiTags('Static Content')
export class StaticContentController {
  constructor(private readonly staticContentService: StaticContentService) {}

  @Post('signed-url')
  @ApiBearerAuth()
  @UsePipes(new FileUploadValidationPipe())
  @SkipThrottle()
  async getSignedUrlForStaticMedia(
    @Body() reqBody: StaticContentSignedUrlDto,
  ): Promise<SignedUrlResponseDto> {
    return await this.staticContentService.getSignedUrlForStaticMedia(reqBody);
  }
}
