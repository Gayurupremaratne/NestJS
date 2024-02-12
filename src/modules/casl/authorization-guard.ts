import { RBAC_ACTIONS, RBAC_SUBJECTS, REGISTRATION_STATUS, STATUS_CODE } from '@common/constants';
import { RoleType } from '@common/constants/role_type.constants';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserDto } from '@user/dto/user.dto';
import { UserService } from '@user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const loggedInUserData: UserDto = await this.userService.getUser(request.user.sub);
      const loggedInUserPermission = await this.userService.getUserPermissions(
        loggedInUserData.role.id,
      );

      const hasAdminPortalAccess = loggedInUserPermission.some((permission) => {
        return (
          permission.permission.subject === RBAC_SUBJECTS.ADMIN_PORTAL &&
          permission.permission.action === RBAC_ACTIONS.MANAGE
        );
      });

      const isUserBanned = loggedInUserData.role.id === RoleType.Banned;

      const hasCompletedRegistration =
        loggedInUserData.registrationStatus === REGISTRATION_STATUS[STATUS_CODE.COMPLETE];

      const canLogin = hasCompletedRegistration || hasAdminPortalAccess;

      if (isUserBanned || !canLogin) {
        throw new ForbiddenException('You are not allowed to perform this action');
      }

      return true;
    } catch (error) {
      throw new ForbiddenException(
        error?.response?.message || 'Registration process has not been completed',
      );
    }
  }
}
