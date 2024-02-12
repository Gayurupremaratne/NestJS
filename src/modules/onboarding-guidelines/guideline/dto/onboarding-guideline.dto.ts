import { Exclude } from 'class-transformer';

export class OnboardingGuidelineTranslationResponse {
  localeId: string;

  order: number;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  content: string;
}
