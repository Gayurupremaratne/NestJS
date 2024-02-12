import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { PoiDto } from './dto/poi.dto';
import { PointOfInterestService } from '../../modules/point-of-interest/point-of-interest.service';
import * as Sentry from '@sentry/node';

const prisma = new PrismaClient();

export class KmlRepository {
  constructor(private readonly poiService: PointOfInterestService) {}
  /**
   * Extract the start and end points from the KML file
   *
   * @param {string} filePath
   * @return {*}  {Promise<[number[], number[]]>}
   * @memberof KmlRepository
   */
  async extractStartAndEndPoints(
    filePath: string,
    stageNumber: number,
  ): Promise<[number[], number[]]> {
    try {
      const geoJsonString = await fs.promises.readFile(filePath, 'utf-8');
      const geoJsonObject = JSON.parse(geoJsonString);

      if (
        geoJsonObject &&
        geoJsonObject?.features &&
        geoJsonObject?.features[0]?.geometry?.type === 'LineString'
      ) {
        const coordinates = geoJsonObject.features[0].geometry.coordinates;

        const startPoint = coordinates[0];
        const endPoint = coordinates[coordinates.length - 1];

        if (
          !startPoint ||
          !endPoint ||
          !startPoint.length ||
          !endPoint.length ||
          startPoint.length !== 3 ||
          endPoint.length !== 3
        ) {
          // E005 - Error extracting start and end points. coordinates should have lat, long and altitude
          throw new Error('E005');
        }
        const stageByStageNumber = await prisma.stage.findFirst({
          where: { number: +stageNumber },
        });

        await prisma.stage.update({
          where: { id: stageByStageNumber.id },
          data: { startPoint: startPoint, endPoint: endPoint },
        });

        return [startPoint, endPoint];
      }
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error.message);
    }
  }

  /**
   * Update the file key of the KML file in the stage table
   *
   * @param {number} stageNo
   * @param {string} fileKey
   * @return {*}  {Promise<any>}
   * @memberof KmlRepository
   */
  async updateStageKmlFileKey(
    stageNo: number,
    fileName: string,
    filePath: string,
  ): Promise<boolean> {
    try {
      const stageByStageNumber = await prisma.stage.findFirst({
        where: { number: +stageNo },
      });

      const updatedStage = await prisma.stage.update({
        where: { id: stageByStageNumber.id },
        data: { kmlFileKey: `${filePath}/${fileName}` },
      });

      if (updatedStage.kmlFileKey !== `${filePath}/${fileName}`) {
        // E006 - Error updating stage kml file key
        throw new Error('E006');
      }

      prisma.$disconnect();

      return true;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error.message);
    }
  }

  async updatePoiInDatabase(filePath: string, stageNumber: number): Promise<void> {
    try {
      const geoJsonString = await fs.promises.readFile(filePath, 'utf-8');
      const geoJsonObject = JSON.parse(geoJsonString);

      if (
        !geoJsonObject ||
        !geoJsonObject?.features ||
        geoJsonObject?.features[1]?.geometry?.type !== 'Point'
      ) {
        // E007 - Error extracting start and end points, invalid geojson file
        throw new Error('E007');
      }

      const coordinates: PoiDto[] = geoJsonObject.features;

      await Promise.all(
        coordinates.map(async (coordinate) => {
          const poi = await prisma.pointOfInterest.findFirst({
            where: {
              latitude: coordinate.geometry.coordinates[1],
              longitude: coordinate.geometry.coordinates[0],
            },
          });

          const stage = await prisma.stage.findFirst({
            where: { number: +stageNumber },
          });

          if (!poi) {
            const poiCreateOption = {
              data: {
                longitude: coordinate.geometry.coordinates[0],
                latitude: coordinate.geometry.coordinates[1],
                mediaKey: null,
                pointOfInterestTranslation: {
                  createMany: {
                    data: { title: coordinate.properties.name, localeId: 'en', description: '' },
                  },
                },
                pointOfInterestStage: {
                  createMany: {
                    data: {
                      stageId: stage.id,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  },
                },
              },
            };

            return await prisma.pointOfInterest.create(poiCreateOption);
          }
        }),
      );

      prisma.$disconnect();
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error.message);
    }
  }

  /**
   * Extract the maximum elevation from the KML file
   *
   * @param {string} filePath
   * @param {number} stageNumber
   * @return {*}  {Promise<[number[], number[]]>}
   * @memberof KmlRepository
   */
  async extractMaximumElevation(
    filePath: string,
    stageNumber: number,
  ): Promise<[number[], number[]]> {
    try {
      const geoJsonString = await fs.promises.readFile(filePath, 'utf-8');
      const geoJsonObject = JSON.parse(geoJsonString);

      if (
        geoJsonObject &&
        geoJsonObject?.features &&
        geoJsonObject?.features[0]?.geometry?.type === 'LineString'
      ) {
        const coordinates = geoJsonObject.features[0].geometry.coordinates;

        const maximumElevation = coordinates.reduce((max: number, currentArray: Array<number>) => {
          if (currentArray.length >= 3) {
            const thirdElement = currentArray[2];
            return thirdElement > max ? thirdElement : max;
          } else {
            return max;
          }
        }, Number.NEGATIVE_INFINITY);

        if (!maximumElevation) {
          // E008 - Error extracting maximum elevation. coordinates should have value > 0
          throw new Error('E008');
        }
        const stageByStageNumber = await prisma.stage.findFirst({
          where: { number: +stageNumber },
        });

        await prisma.stage.update({
          where: { id: stageByStageNumber.id },
          data: { maximumAltitude: maximumElevation },
        });

        return maximumElevation;
      }
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(error.message);
    }
  }
}
