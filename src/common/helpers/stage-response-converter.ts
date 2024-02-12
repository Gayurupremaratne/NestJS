import { hoursAndMinutesToMinutes, minutesToHoursAndMinutes } from './unit-converters';
import { StageDto } from '@app/modules/stage/dto/stage.dto';
import { CreateStageDto } from '@app/modules/stage/dto/create-stage.dto';
import { UpdateStageDto } from '@app/modules/stage/dto/update-stage.dto';
import { StageDatabaseDto } from '@app/modules/stage/dto/stage-database.dto';
import moment from 'moment';

//modify and return a stageDto with correct types
export function convertStageDatabaseToResponse(stage, isStarCountNeeded = false): StageDto {
  const { hours, minutes } = minutesToHoursAndMinutes(stage.estimatedDuration);

  let stageToReturn = {
    ...stage,
    openTime: moment(stage.openTime).format('HH:mm:ss'),
    closeTime: moment(stage.closeTime).format('HH:mm:ss'),
    estimatedDuration: {
      hours,
      minutes,
    },
  };
  if (isStarCountNeeded) {
    stageToReturn = {
      ...stageToReturn,
      starCount: {
        1: stage.ratingOneCount,
        2: stage.ratingTwoCount,
        3: stage.ratingThreeCount,
        4: stage.ratingFourCount,
        5: stage.ratingFiveCount,
      },
    };
    delete stageToReturn.ratingOneCount;
    delete stageToReturn.ratingTwoCount;
    delete stageToReturn.ratingThreeCount;
    delete stageToReturn.ratingFourCount;
    delete stageToReturn.ratingFiveCount;
  }
  return stageToReturn;
}

//modify and return a stageDatabaseDto with correct types
export function convertStageInputToStageDatabase(
  stage: CreateStageDto | UpdateStageDto,
): StageDatabaseDto {
  const convertedMinutes = hoursAndMinutesToMinutes(
    stage.estimatedDuration.hours,
    stage.estimatedDuration.minutes,
  );

  return {
    ...stage,
    estimatedDuration: convertedMinutes,
    openTime: moment(stage.openTime, 'HH:mm:ss').toISOString(),
    closeTime: moment(stage.closeTime, 'HH:mm:ss').toISOString(),
  };
}
