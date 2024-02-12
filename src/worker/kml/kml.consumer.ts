import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import path from 'path';
import { kml } from '@tmcw/togeojson';
import fs from 'fs';
import { DOMParser } from 'xmldom';
import { StaticContentService } from '../../modules/static-content/static-content.service';
import axios, { AxiosInstance } from 'axios';
import { KmlRepository } from './kml.repository';
import { STATIC_CONTENT_PATHS } from '@common/constants';
import * as Sentry from '@sentry/node';

const domParser = new DOMParser();

const geoJsonFolderPath = `${process.cwd()}/src/worker/kml/geojson/`;
const tempFolerPath = `${process.cwd()}/src/worker/temp/`;

@Processor('kml')
export class KmlService {
  private readonly s3AxiosInstance: AxiosInstance;
  constructor(
    private readonly staticContentService: StaticContentService,
    private readonly kmlRepository: KmlRepository,
    @InjectQueue('kml') private readonly createStageGeojson: Queue,
  ) {
    // Axios instance
    this.s3AxiosInstance = axios.create();
  }

  /**
   * Process the KML file and convert it to GeoJSON
   *
   * @param {Job} job
   * @return {*}
   * @memberof KmlService
   */
  @Process('stage-kml-to-geojson')
  async handleStageKml(job: Job) {
    try {
      //generate file name
      const geojsonFileName = `stage_${job.data.fileName}.json`;

      // read in the KML file and then parse it
      const parsedKML = domParser.parseFromString(
        await fs.promises.readFile(job.data.file, 'utf8'),
      );
      const geojson = kml(parsedKML);

      // Construct the full output file path
      const geojsonFilePath = path.join(
        `${process.cwd()}/src/worker/kml/geojson/`,
        geojsonFileName,
      );

      // Write the GeoJSON to a file
      await fs.promises.writeFile(geojsonFilePath, JSON.stringify(geojson, null, 2));

      const geoJsonFile = await fs.promises.readFile(geojsonFilePath);

      // Get the signed URL for the file
      const url = await this.staticContentService.getSignedUrlForStaticMedia({
        fileName: geojsonFileName,
        module: STATIC_CONTENT_PATHS.KML_STAGE_MEDIA,
        contentType: 'application/json',
        fileSize: geoJsonFile.length,
      });

      // Upload the file to S3
      const res = await this.s3AxiosInstance.put(
        url.s3Url,
        await fs.promises.readFile(geojsonFilePath),
      );

      if (res.status !== 200) {
        throw new Error(res.statusText);
      }

      // Update the stage table with the file key
      await this.kmlRepository.updateStageKmlFileKey(
        job.data.fileName,
        url.uniqueFileName,
        STATIC_CONTENT_PATHS.KML_STAGE_MEDIA,
      );

      //extract start and end point lat long
      await this.kmlRepository.extractStartAndEndPoints(geojsonFilePath, job.data.fileName);

      // Get the maximum elevation
      await this.kmlRepository.extractMaximumElevation(geojsonFilePath, job.data.fileName);

      //delete the file from the local folder
      await this.createStageGeojson.add('delete-temp-files', {}, { priority: 10 });

      return { fileName: geojsonFileName, filePath: geojsonFilePath };
    } catch (error) {
      Sentry.captureException(error);

      // Add the job to the queue to delete the temp files
      await this.createStageGeojson.add('delete-temp-files', {}, { priority: 10 });
      job.failedReason = error.message;
      job.moveToFailed(error, true);
      throw new Error(error.message);
    }
  }

  /**
   * Delete the temp files
   *
   * @param {Job} job
   * @memberof KmlService
   */
  @Process('delete-temp-files')
  async handleDeleteTempFiles(job: Job) {
    try {
      //delete the file from the local folder
      const geoJsonFiles = await fs.promises.readdir(geoJsonFolderPath);
      const tempKmlFiles = await fs.promises.readdir(tempFolerPath);

      // Delete the temp files
      for (const file of geoJsonFiles) {
        const filePath = `${geoJsonFolderPath}/${file}`;
        await fs.promises.unlink(filePath); // Delete temp geojson the file
      }

      for (const file of tempKmlFiles) {
        const filePath = `${tempFolerPath}/${file}`;
        await fs.promises.unlink(filePath); // Delete temp kml the file
      }
    } catch (error) {
      Sentry.captureException(error);

      job.moveToFailed({ message: error.message }, true);
      job.failedReason = error.message;
      throw new Error(error.message);
    }
  }

  @Process('kml-to-geojson-general')
  async handleStageKmlGeneral(job: Job) {
    try {
      //generate file name
      const geojsonFileName = `${job.data.fileName}.json`;
      const startsWithPoiPattern = new RegExp(/^poi_/);

      // read in the KML file and then parse it
      const parsedKML = domParser.parseFromString(
        await fs.promises.readFile(job.data.file, 'utf8'),
      );
      const geojson = kml(parsedKML);

      // Construct the full output file path
      const geojsonFilePath = path.join(
        `${process.cwd()}/src/worker/kml/geojson/`,
        geojsonFileName,
      );

      // Write the GeoJSON to a file
      await fs.promises.writeFile(geojsonFilePath, JSON.stringify(geojson, null, 2));

      const geoJsonFile = await fs.promises.readFile(geojsonFilePath);

      // Get the signed URL for the file
      const url = await this.staticContentService.getSignedUrlForStaticMedia({
        fileName: geojsonFileName,
        module: STATIC_CONTENT_PATHS.KML_OTHER_MEDIA,
        contentType: 'application/json',
        fileSize: geoJsonFile.length,
      });

      // Upload the file to S3
      const res = await this.s3AxiosInstance.put(
        url.s3Url,
        await fs.promises.readFile(geojsonFilePath),
      );

      if (res.status !== 200) {
        throw new Error(res.statusText);
      }

      if (startsWithPoiPattern.test(job.data.fileName)) {
        await this.kmlRepository.updatePoiInDatabase(geojsonFilePath, job.data.stageNumber);
      }

      //delete the file from the local folder
      await this.createStageGeojson.add('delete-temp-files', {}, { priority: 10 });

      return { fileName: geojsonFileName, filePath: geojsonFilePath };
    } catch (error) {
      Sentry.captureException(error);

      // Add the job to the queue to delete the temp files
      await this.createStageGeojson.add('delete-temp-files', {}, { priority: 10 });
      job.failedReason = error.message;
      job.moveToFailed(error, true);
      throw new Error(error.message);
    }
  }
}
