import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { PermissionsDto } from './dto/Permissions.dto';
import { CreatePermissionDto } from './dto/create-permissions.dto';
import { reqParamsDto } from './dto/req-params.dto';
import { PermissionsService } from './permissions.service';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('permissions')
@ApiTags('Permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.PERMISSION })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async findAll(): Promise<JsonResponse<PermissionsDto[]>> {
    return JsonResponseSerializer(await this.permissionsService.findAll());
  }

  @Post('assign-permissions/role/:roleId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.PERMISSION })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async assignPermissionsToRole(
    @Param() reqParams: reqParamsDto,
    @Body() data: CreatePermissionDto[],
  ): Promise<JsonResponse<Prisma.BatchPayload>> {
    if (reqParams.roleId <= 3) {
      throw new HttpException('Cannot assign permissions to default roles', HttpStatus.FORBIDDEN);
    }

    const redefinedData = await Promise.all(
      data.map((permission) => {
        return {
          ...permission,
          roleId: Number(reqParams.roleId),
        };
      }),
    );

    return JsonResponseSerializer(
      await this.permissionsService.assignPermissionsToRole(redefinedData),
    );
  }

  @Put('assign-permissions/role/:roleId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.PERMISSION })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updatePermissionsToRole(
    @Param() reqParams: reqParamsDto,
    @Body() data: CreatePermissionDto[],
  ): Promise<JsonResponse<Prisma.BatchPayload>> {
    if (reqParams.roleId <= 3) {
      throw new HttpException('Cannot update permissions on default roles', HttpStatus.FORBIDDEN);
    }

    const redefinedData = await Promise.all(
      data.map((permission) => {
        return {
          ...permission,
          roleId: Number(reqParams.roleId),
        };
      }),
    );

    return JsonResponseSerializer(
      await this.permissionsService.updatePermissionsToRole(redefinedData),
    );
  }
}
