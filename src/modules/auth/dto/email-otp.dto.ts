import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailOtpDto implements Prisma.EmailOtpCreateInput {
  @IsEmail()
  email: string;

  @IsString()
  code: string;

  @IsDate()
  expiresAt: Date;

  @IsString()
  @IsOptional()
  emailVerifyUserId?: string;

  @IsString()
  @IsOptional()
  passwordResetUserId?: string;

  @IsString()
  @IsOptional()
  confirmationAttempts?: number;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  code: string;
}
