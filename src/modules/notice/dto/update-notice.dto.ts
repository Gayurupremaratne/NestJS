import { OmitType } from '@nestjs/mapped-types';
import { CreateNoticeDto } from './create-notice.dto';

export class UpdateNoticeDto extends OmitType(CreateNoticeDto, ['type']) {}
