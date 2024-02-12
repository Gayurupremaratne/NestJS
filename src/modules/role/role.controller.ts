import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { JsonResponse } from '@common/types';
import { RoleDto } from './dto/role.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleIdentifierDto } from './dto/role-get-param.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleAssignParamsDto } from './dto/role-assign-param.dto';
import { UserDto } from '@user/dto/user.dto';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { QueryParamsDto } from './dto/query-params.dto';
import { AuthGuard } from '../casl/authorization-guard';

@Controller('roles')
@ApiTags('Roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * Get all roles
   * @returns {Promise<JsonResponse<RoleDto[]>>}
   */
  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.ROLE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllRoles(@Query() queryParams: QueryParamsDto): Promise<JsonResponse<RoleDto[]>> {
    return JsonResponseSerializer(await this.roleService.getAllRoles(queryParams));
  }

  /**
   * Get role by id
   * @param id
   * @returns {Promise<JsonResponse<RoleDto | null>>}
   */

  @Get(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getRole(@Param() queryParams: RoleIdentifierDto): Promise<JsonResponse<RoleDto | null>> {
    return JsonResponseSerializer(await this.roleService.getRole(queryParams.id));
  }

  /**
   * Create role
   * @param data
   * @returns {Promise<JsonResponse<RoleDto>>}
   */
  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.ROLE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async createRole(@Body() data: CreateRoleDto): Promise<JsonResponse<RoleDto>> {
    return JsonResponseSerializer(await this.roleService.createRole(data));
  }

  /**
   * Update role
   * @param id
   * @param data
   * @returns {Promise<JsonResponse<RoleDto>>}
   */

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.ROLE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateRole(
    @Param() reqParams: RoleIdentifierDto,
    @Body() data: UpdateRoleDto,
  ): Promise<JsonResponse<RoleDto>> {
    return JsonResponseSerializer(await this.roleService.updateRole(reqParams.id, data));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.ROLE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteRole(@Param() reqParams: RoleIdentifierDto): Promise<JsonResponse<RoleDto>> {
    return JsonResponseSerializer(await this.roleService.deleteRole(reqParams.id));
  }

  @Post('assign-permissions/user/:userId/role/:roleId')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.MANAGE, subject: RBAC_SUBJECTS.ROLE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async assignPermissionsToRole(
    @Param() reqParams: RoleAssignParamsDto,
  ): Promise<JsonResponse<UserDto>> {
    return JsonResponseSerializer(
      await this.roleService.assignPermissionsToRole(reqParams.userId, reqParams.roleId),
    );
  }
}
