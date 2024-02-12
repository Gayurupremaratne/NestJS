import { Exclude } from 'class-transformer';

export class DeleteAccountResponse {
  userId: string;

  @Exclude()
  token: string;

  @Exclude()
  expiredAt: Date;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
