import { ExistsConstraint } from '@common/validators/ExistsConstraint';
import { Module } from '@nestjs/common';
import { PoliciesController } from '@policies/policies.controller';
import { PoliciesService } from '@policies/policies.service';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserModule } from '@user/user.module';
import { PolicyAcceptancesController } from './acceptances/policy-acceptances.controller';
import { PolicyAcceptancesService } from './acceptances/policy-acceptances.service';
import { TranslationsController } from './translations/translations.controller';
import { TranslationsService } from './translations/translations.service';

@Module({
  imports: [UserModule],
  controllers: [PoliciesController, TranslationsController, PolicyAcceptancesController],
  providers: [
    PoliciesService,
    PrismaService,
    TranslationsService,
    PolicyAcceptancesService,
    ExistsConstraint,
  ],
})
export class PoliciesModule {}
