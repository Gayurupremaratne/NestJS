import { Test, TestingModule } from '@nestjs/testing';
import { GeojsonStaticContentService } from '../geojson-static-content.service';
import { AppConfig } from '@config/app-config';
import { ConfigModule } from '@nestjs/config';

describe('GeojsonStaticContentService', () => {
  let service: GeojsonStaticContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [AppConfig],
        }),
      ],
      providers: [GeojsonStaticContentService],
    }).compile();

    service = module.get<GeojsonStaticContentService>(GeojsonStaticContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a signed url for geojson', async () => {
    const reqBody = {
      fileKey: 'test',
    };

    const signedUrl = await service.getSignedUrlForGeoJsonStage(reqBody.fileKey);

    expect(signedUrl).toBeDefined();
    expect(signedUrl).toHaveProperty('s3Url');
  });

  it('should fail to return a signed url for geojson', async () => {
    const reqBody = {
      fileKey: null,
    };

    try {
      await service.getSignedUrlForGeoJsonStage(reqBody.fileKey);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should return a signed url for geojson', async () => {
    const signedUrl = await service.getSignedUrlForGeoJsonOther();

    expect(signedUrl).toBeDefined();
    expect(signedUrl[0]).toHaveProperty('s3Url');
  });

  it('should fail to return a signed url for geojson', async () => {
    jest.spyOn(service, 'getSignedUrlForGeoJsonOther').mockRejectedValueOnce('error');

    async function asyncFunctionThatThrowsError() {
      await service.getSignedUrlForGeoJsonOther();
    }
    await expect(asyncFunctionThatThrowsError()).rejects.toMatch('error');
  });
});
