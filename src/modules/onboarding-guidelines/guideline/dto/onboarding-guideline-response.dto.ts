import { OnboardingGuidelineTranslation } from '@prisma/client';
import { OnboardingMetaDto } from '../../meta/dto/onboarding-meta.dto';

export class OnboardingGuidelineResponse {
  onboardingGuidelines: OnboardingGuidelineTranslation[];

  metaTranslations: OnboardingMetaDto[];
}
