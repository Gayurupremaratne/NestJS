import { GetPoiDto, GetPoiTranslationDto } from './get-poi.dto';

export interface UpdatePoiDto {
  updatedPoi: GetPoiDto;
  updatedPoiTranslations: GetPoiTranslationDto[];
}
