import { RBAC_ACTIONS, RBAC_SUBJECTS, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StaticContentService } from '../static-content/static-content.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryParamsDto } from './dto/query-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEmail } from './dto/user-email.dto';
import { UserPermissionsDto } from './dto/user-permissions.dto';
import { UserDto } from './dto/user.dto';
import { UserRepository } from './user.repository';
import { NotificationStatus } from './dto/profile.dto';
import { RoleType } from '@common/constants/role_type.constants';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private staticContentService: StaticContentService,
    private readonly keycloakService: KeycloakService,
  ) {}

  async getAllUsers(data: QueryParamsDto): Promise<UserDto> {
    return plainToClass(UserDto, await this.userRepository.getAllUsers(data));
  }

  async getUser(id: string): Promise<UserDto | null> {
    return plainToClass(UserDto, await this.userRepository.getUser(id));
  }

  async createUser(data: CreateUserDto): Promise<UserDto> {
    return plainToClass(UserDto, await this.userRepository.createUser(data));
  }

  async updateUser(userId: string, userData: UpdateUserDto): Promise<UserDto> {
    const user = await this.userRepository.getUser(userId);

    //update user for PENDING_EMERGENCY registration status
    if (
      user.registrationStatus == REGISTRATION_STATUS[STATUS_CODE.PENDING_SOCIAL_ACCOUNT] &&
      user.emailVerified
    ) {
      userData.registrationStatus = REGISTRATION_STATUS[STATUS_CODE.PENDING_EMERGENCY];
    }

    const updatedUser = await this.userRepository.updateUser(userId, userData);

    //delete old profile image from user profile
    if (user.profileImageKey && user.profileImageKey != updatedUser.profileImageKey) {
      await this.staticContentService.s3DeleteObjects([user.profileImageKey]);
      await this.staticContentService.deleteAssetKeys(user.profileImageKey);
    }

    return plainToClass(UserDto, updatedUser);
  }

  async getUserPermissions(id: number): Promise<any> {
    return plainToClass(UserPermissionsDto, this.userRepository.getPermissions(id));
  }

  /**
   *  Change Password
   *  @param currentpassword
   *  @param newPassword
   */
  async changePassword(userId: string, data: ChangePasswordDto): Promise<UserDto> {
    const user = await this.userRepository.getUser(userId);

    await this.keycloakService.changePassword(user, data);
    return plainToClass(UserDto, user);
  }

  async getUsersByRoleId(roleId: number, queryParams: QueryParamsDto): Promise<UserDto> {
    return plainToClass(UserDto, await this.userRepository.getUsersByRoleId(roleId, queryParams));
  }

  async getUserByEmail(email: string): Promise<UserEmail[] | null> {
    return plainToClass(UserEmail, await this.userRepository.getUsersByEmail(email));
  }

  async validateAdminUserDelete(authUserId: string): Promise<boolean> {
    const authUserData = await this.userRepository.getUser(authUserId);
    const userPermission = await this.userRepository.getPermissions(authUserData.role_id);

    // check is the specific role has permission to delete user
    const isAuthorized = userPermission.some((permission) => {
      return (
        (permission.permission.subject === RBAC_SUBJECTS.USER &&
          (permission.permission.action === RBAC_ACTIONS.DELETE ||
            permission.permission.action === RBAC_ACTIONS.MANAGE)) ||
        (permission.permission.action === RBAC_ACTIONS.MANAGE &&
          permission.permission.subject === RBAC_SUBJECTS.ALL)
      );
    });

    return isAuthorized;
  }

  async validateUpdateUserPermission(authUserId: string): Promise<boolean> {
    const authUserData = await this.userRepository.getUser(authUserId);
    const userPermission = await this.userRepository.getPermissions(authUserData.role_id);

    // check is the specific role has permission to update user
    const isAuthorized = userPermission.some((permission) => {
      return (
        (permission.permission.subject === RBAC_SUBJECTS.USER &&
          (permission.permission.action === RBAC_ACTIONS.UPDATE ||
            permission.permission.action === RBAC_ACTIONS.MANAGE)) ||
        (permission.permission.action === RBAC_ACTIONS.MANAGE &&
          permission.permission.subject === RBAC_SUBJECTS.ALL)
      );
    });

    return isAuthorized;
  }

  async checkPermissionToEditUserRoleByAdmin(
    authUserRoleId: number,
    updateRoleId: number,
  ): Promise<boolean> {
    if (updateRoleId === RoleType.SuperAdmin) {
      return authUserRoleId === RoleType.SuperAdmin;
    } else {
      return true;
    }
  }

  async getUserNotificationStatus(userId: string): Promise<NotificationStatus> {
    return await this.userRepository.getUserNotificationStatus(userId);
  }
}
