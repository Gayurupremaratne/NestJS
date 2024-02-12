import { OmitType } from '@nestjs/swagger';
import { CreateUserAdminDto } from '@user/dto/create-user-admin.dto';
export class CreateAccountAdminDto extends OmitType(CreateUserAdminDto, [
  'id',
  'registrationStatus',
]) {}
