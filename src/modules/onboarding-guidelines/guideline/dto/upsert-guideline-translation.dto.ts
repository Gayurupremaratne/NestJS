import { Exists } from '@common/validators/ExistsConstraint';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsNumber, IsString, Min } from 'class-validator';

export class UpsertGuidelineTranslationDto
  implements Prisma.OnboardingGuidelineTranslationCreateInput
{
  @ApiProperty()
  @IsString()
  @Exists('locale', 'code')
  localeId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty()
  @IsString()
  content: string;
}
