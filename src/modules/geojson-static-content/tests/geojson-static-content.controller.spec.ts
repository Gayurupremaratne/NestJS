import { Test, TestingModule } from '@nestjs/testing';
import { GeojsonStaticContentController } from '../geojson-static-content.controller';
import { GeojsonStaticContentService } from '../geojson-static-content.service';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from '@config/app-config';

describe('GeojsonStaticContentController', () => {
  let controller: GeojsonStaticContentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      controllers: [GeojsonStaticContentController],
      providers: [GeojsonStaticContentService],
    }).compile();

    controller = module.get<GeojsonStaticContentController>(GeojsonStaticContentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a signed url for geojson', async () => {
    const reqBody = {
      fileKey: 'test',
    };

    const signedUrl = await controller.getSignedUrlForGeoJsonStage(reqBody);

    expect(signedUrl).toBeDefined();
    expect(signedUrl).toHaveProperty('s3Url');
  });

  it('should return a signed url for geojson', async () => {
    const signedUrl = await controller.getSignedUrlForGeoJsonOther();

    expect(signedUrl).toBeDefined();
    expect(signedUrl[0]).toHaveProperty('s3Url');
  });
});
