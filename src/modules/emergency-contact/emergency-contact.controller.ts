import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { Body, Controller, Get, Param, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JsonResponseSerializer } from '@common/serializers';
import { EmergencyContactService } from './emergency-contact.service';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { EmergencyContactDto } from '../auth/dto/emergency-contact.dto';
import { EmergencyContactAdminDto } from './dto/update-emergency.dto';
import { GetEmergencyContactParamDto } from './dto/params-emergency.dto';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('emergency-contact')
@UseInterceptors(new ResponseInterceptor())
@ApiTags('Emergency contact')
export class EmergencyContactController {
  constructor(private readonly emergencyContactService: EmergencyContactService) {}

  @Put()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async updateEmergencyContact(
    @AuthenticatedUser() user,
    @Body()
    data: EmergencyContactDto,
  ) {
    return JsonResponseSerializer(
      await this.emergencyContactService.upsertEmergencyContact(user.sub, data),
    );
  }

  @Put('/user/:userId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.USER })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateEmergencyContactByUserId(
    @Param() params: GetEmergencyContactParamDto,
    @Body()
    data: EmergencyContactAdminDto,
  ) {
    return JsonResponseSerializer(
      await this.emergencyContactService.upsertEmergencyContact(params.userId, data),
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getEmergencyContact(@AuthenticatedUser() user) {
    return JsonResponseSerializer(await this.emergencyContactService.getEmergencyContact(user.sub));
  }

  @Get('/user/:userId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getEmergencyContactByUserId(@Param() params: GetEmergencyContactParamDto) {
    return JsonResponseSerializer(
      await this.emergencyContactService.getEmergencyContactByUserId(params),
    );
  }
}
