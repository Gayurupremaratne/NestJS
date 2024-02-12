import { NotFoundHelper } from '@common/helpers';
import { Exists } from '@common/validators/ExistsConstraint';
import { IsNumber, IsString, Max, Min, ValidateIf } from 'class-validator';

export class GetAllUsersTrailSummaryParamsDto {
  @IsString()
  @ValidateIf((model) => model.stageId !== 'All')
  @Exists('stage', 'id', NotFoundHelper)
  stageId: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2000)
  year: number;
}
