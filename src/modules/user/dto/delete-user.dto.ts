import { IsBoolean, IsDate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class DeleteUserDto extends UpdateUserDto {
  @IsDate()
  deletionDate?: Date;

  @IsBoolean()
  isDeleted: boolean;
}
