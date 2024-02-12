import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { PolicyAcceptances } from '@prisma/client';

@Injectable()
export class PolicyAcceptancesService {
  constructor(private prismaService: PrismaService) {}

  /**
   * @async
   * @function getAllUserAcceptances
   * Gets an object of policies that are accepted/rejected by user.
   *
   * @param {string} userId The user's identifier.
   *
   * @returns {Promise<Record<string, boolean>>}
   * The key of the returned record refers to the policyId.
   * The value of the returned record refers to the acceptances status.
   */
  async getAllUserAcceptances(userId: string): Promise<Record<string, boolean>> {
    const [acceptances, policiesRequiringAcceptance] = await Promise.all([
      this.prismaService.policyAcceptances.findMany({
        where: {
          userId,
        },
        select: {
          policyId: true,
        },
      }),
      this.getPoliciesThatRequireAcceptance(),
    ]);

    const acceptancePolicyIds = acceptances.map((acceptance) => acceptance.policyId);

    const policyAcceptanceMapping = policiesRequiringAcceptance.map((policyRequiringAcceptance) => {
      return {
        [policyRequiringAcceptance]: acceptancePolicyIds.includes(policyRequiringAcceptance),
      };
    });

    return Object.assign({}, ...policyAcceptanceMapping);
  }

  /**
   * @async
   * @function getPoliciesThatRequireAcceptance
   * Returns an array of string of identifiers of policies
   * that require acceptance.
   *
   * @returns {Promise<string[]>}
   */
  async getPoliciesThatRequireAcceptance(): Promise<string[]> {
    const policies = await this.prismaService.policy.findMany({
      where: {
        acceptanceRequired: true,
        isGroupParent: false,
      },
      select: {
        id: true,
      },
    });

    return policies.map((policy) => policy.id);
  }

  /**
   * @async
   * @function acceptPolicy
   * Marks a particular policy as accepted by a user.
   *
   * @param {string} userId
   * @param {string} policyId
   * @returns {Promise<PolicyAcceptances>}
   */
  async acceptPolicy(userId: string, policyId: string): Promise<PolicyAcceptances> {
    const record = await this.prismaService.policyAcceptances.upsert({
      where: {
        policyId_userId: {
          policyId,
          userId,
        },
      },
      update: {},
      create: {
        policyId,
        userId,
      },
    });

    return record;
  }
}
