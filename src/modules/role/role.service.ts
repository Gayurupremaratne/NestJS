import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { plainToClass, plainToInstance } from 'class-transformer';
import { RoleRepository } from './role.repository';
import { RoleDto } from './dto/role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserDto } from '@user/dto/user.dto';
import { QueryParamsDto } from './dto/query-params.dto';

@Injectable()
export class RoleService {
  constructor(private roleRepository: RoleRepository) {}

  async getAllRoles(data: QueryParamsDto): Promise<any> {
    return plainToClass(RoleDto, await this.roleRepository.getAllRoles(data));
  }

  async getRole(id: number): Promise<RoleDto | null> {
    return plainToClass(RoleDto, await this.roleRepository.getRole(id));
  }

  async createRole(data: CreateRoleDto): Promise<RoleDto> {
    try {
      return plainToClass(RoleDto, await this.roleRepository.createRole(data));
    } catch (error) {
      throw new InternalServerErrorException('Role creation failed');
    }
  }

  async updateRole(id: number, data: UpdateRoleDto): Promise<RoleDto> {
    return plainToClass(RoleDto, await this.roleRepository.updateRole(id, data));
  }

  async deleteRole(id: number): Promise<RoleDto> {
    return await this.roleRepository.deleteRole(id);
  }

  async assignPermissionsToRole(userId: string, roleId: number): Promise<UserDto> {
    return plainToInstance(
      UserDto,
      await this.roleRepository.assignPermissionsToRole(userId, roleId),
    );
  }
}
