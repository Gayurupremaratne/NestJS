import { IsUUID } from 'class-validator';

export class UserAwardedBadgesIdentifierDto {
  @IsUUID()
  userId: string;
}

export class DeleteUserAssignedBadgeDto {
  @IsUUID()
  id: string;
}
