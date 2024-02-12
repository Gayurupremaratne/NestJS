import { Module } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { UserService } from '@user/user.service';
import { AuthGuard } from '../casl/authorization-guard';
import { ExportToExcelService } from '../export-to-excel/export-to-excel.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { PassesService } from '../passes/passes.service';
import { StaticContentRepository } from '../static-content/static-content.repository';
import { StaticContentService } from '../static-content/static-content.service';
import { UserRepository } from '../user/user.repository';
import { ReportController } from './report.controller';
import { ReportRepository } from './report.repository';
import { ReportService } from './report.service';
import { MailConsumerModule } from '../../worker/mail/mail.consumer.module';

@Module({
  imports: [MailConsumerModule],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportRepository,
    PassesService,
    PrismaService,
    ExportToExcelService,
    AuthGuard,
    UserService,
    UserRepository,
    KeycloakService,
    StaticContentService,
    StaticContentRepository,
  ],
})
export class ReportModule {}
