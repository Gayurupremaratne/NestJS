import { UserDto } from './user.dto';
import { UserPermissionsDto } from './user-permissions.dto';

export type NotificationStatus = {
  stage: boolean;
  all: boolean;
};

export class ProfileDto {
  apiData: UserDto;
  userPermissions: UserPermissionsDto[];
  notificationStatus: NotificationStatus;
}
