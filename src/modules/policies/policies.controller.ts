import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { PolicyDto } from './dto/policy.dto';
import { Public } from 'nest-keycloak-connect';
import { PolicyIdentifierDto } from './dto/policy-identifier.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('policies')
@ApiTags('Policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.POLICIES_AND_CONDITIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async create(@Body() createPolicyDto: CreatePolicyDto): Promise<JsonResponse<PolicyDto>> {
    const createdPolicy = await this.policiesService.create({
      ...createPolicyDto,
      acceptanceRequired: createPolicyDto.isGroupParent
        ? false
        : createPolicyDto.acceptanceRequired,
      icon: createPolicyDto.parentPolicyId === undefined ? createPolicyDto.icon : null,
    });

    return JsonResponseSerializer(await this.policiesService.findOne(createdPolicy.id));
  }

  @Get()
  @Public()
  async findAll(): Promise<JsonResponse<PolicyDto[]>> {
    return JsonResponseSerializer(await this.policiesService.findAll());
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') idOrSlug: string): Promise<JsonResponse<PolicyDto>> {
    return JsonResponseSerializer(await this.policiesService.findOne(idOrSlug));
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.POLICIES_AND_CONDITIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async update(
    @Param() queryParameters: PolicyIdentifierDto,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ): Promise<JsonResponse<PolicyDto>> {
    const policy = await this.policiesService.findOne(queryParameters.id);

    if (updatePolicyDto.id !== policy.id) {
      throw new InternalServerErrorException();
    }

    const updateDto: UpdatePolicyDto = {
      id: updatePolicyDto.id,
      slug: updatePolicyDto.slug,
      order: updatePolicyDto.order,
    };

    if (policy.parentPolicyId === null || typeof policy.parentPolicyId === 'undefined') {
      if (updatePolicyDto.icon) {
        updateDto.icon = updatePolicyDto.icon;
      }
    }

    if (!policy.isGroupParent) {
      updateDto.acceptanceRequired = updatePolicyDto.acceptanceRequired;
    }

    await this.policiesService.update(queryParameters.id, updateDto);

    return JsonResponseSerializer(await this.policiesService.findOne(queryParameters.id));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.POLICIES_AND_CONDITIONS })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async remove(@Param() queryParameters: PolicyIdentifierDto): Promise<JsonResponse<PolicyDto>> {
    const record = await this.policiesService.findOne(queryParameters.id);
    await this.policiesService.remove(queryParameters.id);

    return JsonResponseSerializer(record);
  }
}
