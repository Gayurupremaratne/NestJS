import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PolicyIdentifierDto } from '@policies/dto/policy-identifier.dto';
import { PolicyAcceptances } from '@prisma/client';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { AbilitiesGuard } from '../../casl/abilities.guard';
import { PolicyAcceptancesService } from './policy-acceptances.service';

@Controller()
@ApiTags('Policies')
export class PolicyAcceptancesController {
  constructor(private policyAcceptancesService: PolicyAcceptancesService) {}

  @Get('/policy-acceptances')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.POLICIES_AND_CONDITIONS })
  @UseGuards(AbilitiesGuard)
  async getAllPolicyAcceptances(
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<Record<string, boolean>>> {
    return JsonResponseSerializer(
      await this.policyAcceptancesService.getAllUserAcceptances(user.sub),
    );
  }

  @Post('/policies/:id/accept')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.POLICIES_AND_CONDITIONS })
  @UseGuards(AbilitiesGuard)
  async acceptPolicy(
    @Param() urlParameters: PolicyIdentifierDto,
    @AuthenticatedUser() user,
  ): Promise<JsonResponse<PolicyAcceptances>> {
    return JsonResponseSerializer(
      await this.policyAcceptancesService.acceptPolicy(user.sub, urlParameters.id),
    );
  }
}
