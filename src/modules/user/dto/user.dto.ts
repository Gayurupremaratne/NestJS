import { REGISTRATION_STATUS } from '@common/constants';
import { EmailOtp, Locale, Role, UserFavouriteStage } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserDto {
  id?: string;

  firstName: string;

  lastName: string;

  email: string;

  nationalityCode: string;

  countryCode: string;

  contactNumber: string;

  passportNumber?: string;

  nicNumber?: string;

  dateOfBirth?: Date;

  emailVerified?: boolean;

  emailOtpSentAt?: Date;

  @Exclude()
  googleToken?: string;

  @Exclude()
  facebookToken?: string;

  @Exclude()
  instagramToken?: string;

  @Exclude()
  appleToken?: string;

  @Exclude()
  profilePictureKey?: string;

  createdAt?: Date;

  updatedAt?: Date;

  @Exclude()
  emailOtp?: EmailOtp;

  @Exclude()
  passwordResetOtp?: EmailOtp;

  @Exclude()
  passwordResetOtpId: string;

  preferredLocaleId: string;

  @Exclude()
  emailOtpId: string;

  @Exclude()
  preferredLocale?: Locale;

  registrationStatus: (typeof REGISTRATION_STATUS)[number];

  loginAt?: Date;

  @Exclude()
  role_id?: number;

  role?: Role;

  userFavouriteStages?: UserFavouriteStage;

  profileImageKey?: string;
}

export class UserDtoWithOtpExpiration extends UserDto {
  emailOtpExpiresAt: Date;
}
