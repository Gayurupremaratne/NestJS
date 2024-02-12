import { GeometryDto } from './geometry.dto';

export class PoiDto {
  type: string;
  geometry: GeometryDto;
  properties: {
    name: string;
  };
}
