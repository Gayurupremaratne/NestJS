import { STAGE_DIFFICULTY_TYPES } from '@common/constants';
import { FAMILY_FRIENDLY_STATUS } from '@common/constants/family_friendly_status.constant';
import { PEOPLE_INTERACTIONS } from '@common/constants/people_interaction.constant';
import { Duration, ReviewRating } from '@common/types';
import { Tag } from '@common/types/tag.type';
import { Region, StageTranslation } from '@prisma/client';

export class StageDto {
  id?: string;

  distance: number;

  estimatedDuration: Duration;

  openTime: string;

  closeTime: string;

  elevationGain: number;

  open: boolean;

  number: number;

  cumulativeReviews: number;

  reviewsCount: number;

  difficultyType: (typeof STAGE_DIFFICULTY_TYPES)[number];

  peopleInteraction: (typeof PEOPLE_INTERACTIONS)[number];

  familyFriendly: (typeof FAMILY_FRIENDLY_STATUS)[number];

  starCount?: ReviewRating;

  tags: Tag[] | null;

  stageMedia: string[];

  translations: StageTranslation[];

  regions: Region[];

  isFavorite: boolean;

  createdAt?: Date;

  updatedAt?: Date;

  kmlFileKey: string;

  startPoint: number[];

  endPoint: number[];

  mainImageKey: string;

  elevationImageKey: string;

  maximumAltitude: number;
}
