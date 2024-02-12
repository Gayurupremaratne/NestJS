import {
  BadRequestException,
  Controller,
  HttpException,
  NotFoundException,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { FileInterceptor } from '@nestjs/platform-express';
import fs from 'fs';
import { JsonResponseSerializer } from '@common/serializers';
import { GEOJSON_FILE_TYPES, RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import * as Sentry from '@sentry/node';
import { AbilitiesGuard } from '../../modules/casl/abilities.guard';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { fileSizeValidator } from '@common/validators/fileSizeValidator';
const geojsonFolder = `${process.cwd()}/src/worker/kml/geojson/`;
const tempFolder = `${process.cwd()}/src/worker/temp/`;

@Controller('kml')
@ApiTags('KML')
export class KmlController {
  constructor(
    @InjectQueue('kml') private readonly createStageGeojson: Queue,
    @InjectQueue('kml') private readonly createProtectedAreaGeojson: Queue,
  ) {
    if (!fs.existsSync(geojsonFolder)) {
      fs.mkdirSync(geojsonFolder, { recursive: true });
    }

    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }
  }

  @Post('stage-kml')
  @checkAbilities({ action: RBAC_ACTIONS.MANAGE, subject: RBAC_SUBJECTS.KML })
  @UseGuards(AbilitiesGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // Don't save the file to disk
    }),
  )
  async generateStageGeoJson(@UploadedFile() file: Express.Multer.File, @Req() req) {
    try {
      const fileName: string = req.body.fileName;

      //check the file Size
      fileSizeValidator(file.size);

      // Check if the file is a KML file
      if (!file) {
        // E001 - File not found
        throw new NotFoundException('E001');
      }

      // Check if the file is a KML file
      if (file.mimetype !== 'application/vnd.google-earth.kml+xml') {
        // Delete the uploaded file from the temporary folder
        await fs.promises.unlink(file.path);
        // E002 Invalid file type, only KML files are allowed
        throw new BadRequestException('E002');
      }

      if (!fileName) {
        // Delete the uploaded file from the temporary folder
        await fs.promises.unlink(file.path);
        // E003 - File name is required(fileName). This should be same as the stage number of the uploading KML file
        throw new BadRequestException('E003');
      }

      // Add the job to the queue
      const FromKmlToGeoJson = await this.createStageGeojson.add('stage-kml-to-geojson', {
        file: file.path,
        fileName: fileName,
      });

      const returnedData = await FromKmlToGeoJson.finished();

      if (returnedData) {
        return JsonResponseSerializer(returnedData);
      } else {
        throw new HttpException('Something went wrong', 500);
      }
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, error.status);
    }
  }

  @Post('general-kml')
  @checkAbilities({ action: RBAC_ACTIONS.MANAGE, subject: RBAC_SUBJECTS.KML })
  @UseGuards(AbilitiesGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // Don't save the file to disk
    }),
  )
  async generategeneralAreasGeoJson(@UploadedFile() file: Express.Multer.File, @Req() req) {
    try {
      const fileName: string = req.body.fileName;

      //check the file Size
      fileSizeValidator(file.size);

      // Check if the file is a KML file
      if (!file) {
        // E001 - File not found
        throw new NotFoundException('E001');
      }

      if (!fileName || !Object.values(GEOJSON_FILE_TYPES).includes(fileName)) {
        // Delete the uploaded file from the temporary folder
        await fs.promises.unlink(file.path);

        // E004 - Invalid file name, File names should includes either [${Object.values(GEOJSON_FILE_TYPES,)}] of the following

        throw new BadRequestException('E004');
      }

      // Check if the file is a KML file
      if (file.mimetype !== 'application/vnd.google-earth.kml+xml') {
        // Delete the uploaded file from the temporary folder
        await fs.promises.unlink(file.path);
        // E002 Invalid file type, only KML files are allowed
        throw new BadRequestException('E002');
      }

      // Add the job to the queue
      const FromKmlToGeoJson = await this.createProtectedAreaGeojson.add('kml-to-geojson-general', {
        file: file.path,
        fileName: fileName,
      });

      const returnedData = await FromKmlToGeoJson.finished();

      if (returnedData) {
        return JsonResponseSerializer(returnedData);
      } else {
        throw new HttpException('Something went wrong', 500);
      }
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, error.status);
    }
  }

  @Post('poi-kml')
  @checkAbilities({ action: RBAC_ACTIONS.MANAGE, subject: RBAC_SUBJECTS.KML })
  @UseGuards(AbilitiesGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // Don't save the file to disk
    }),
  )
  async generatePOIGeoJson(@UploadedFile() file: Express.Multer.File, @Req() req) {
    try {
      const fileName: string = req.body.fileName;
      const stageNumber: number = req.body.stageNumber;

      //check the file Size
      fileSizeValidator(file.size);

      // Check if the file is a KML file
      if (!file) {
        // E001 - File not found
        throw new NotFoundException('E001');
      }

      if (!fileName) {
        // Delete the uploaded file from the temporary folder
        await fs.promises.unlink(file.path);
        // E003 - File name is required(fileName). This should be same as the stage number of the uploading KML file
        throw new BadRequestException(`E003`);
      }

      // Check if the file is a KML file
      if (file.mimetype !== 'application/vnd.google-earth.kml+xml') {
        // Delete the uploaded file from the temporary folder
        await fs.promises.unlink(file.path);
        // E002 Invalid file type, only KML files are allowed
        throw new BadRequestException('E002');
      }

      // Add the job to the queue
      const FromKmlToGeoJson = await this.createProtectedAreaGeojson.add('kml-to-geojson-general', {
        file: file.path,
        fileName: `poi_${stageNumber}`,
        stageNumber: stageNumber,
      });

      const returnedData = await FromKmlToGeoJson.finished();

      if (returnedData) {
        return JsonResponseSerializer(returnedData);
      } else {
        throw new HttpException('Something went wrong', 500);
      }
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, error.status);
    }
  }
}
