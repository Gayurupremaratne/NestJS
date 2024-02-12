import { UserDto } from '@user/dto/user.dto';

export interface VerifyRecoveryCodeExpirationDto {
  emailOtpSentAt: Date;
  emailOtpExpiresAt: Date;
}
export interface VerifyCodeRecoveryResponseDto {
  verified: boolean;
  user?: UserDto;
  expirationData: VerifyRecoveryCodeExpirationDto;
}
