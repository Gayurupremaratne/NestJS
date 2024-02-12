import { Policy, PolicyTranslations } from '@prisma/client';

export class PolicyDto {
  id: string;
  order: number;
  parentPolicyId?: string;
  parentPolicy?: Policy;
  childPolicies: Policy[];
  acceptanceRequired: boolean;
  icon: string;
  isGroupParent: boolean;
  policyTranslations: PolicyTranslations[];
  slug?: string;
  createdAt: Date;
  updatedAt: Date;
}
