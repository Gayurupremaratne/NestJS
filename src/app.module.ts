import { AppConfig } from '@config/app-config';
import { ConfigValidation } from '@config/app-config.validation';
import { BullModule } from '@nestjs/bull';
import { HttpStatus, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PoliciesModule } from '@policies/policies.module';
import { SentryModule } from '@travelerdev/nestjs-sentry';
import { AuthGuard, KeycloakConnectModule } from 'nest-keycloak-connect';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  API_REQUEST_RATE_THROTTLER_LIMIT,
  API_REQUEST_RATE_THROTTLER_TTL,
  RELEASE_VERSION,
  SENTRY_ENVIRONMENTS,
} from './common';
import { LocaleModule } from './locale/locale.module';
import { AssetReportsModule } from './modules/asset-reports/asset-reports.module';
import { AuthModule } from './modules/auth/auth.module';
import { BadgeModule } from './modules/badge/badge.module';
import { EmergencyContactModule } from './modules/emergency-contact/emergency-contact.module';
import { ExportToExcelModule } from './modules/export-to-excel/export-to-excel.module';
import { FcmTokensModule } from './modules/fcm-tokens/fcm-tokens.module';
import { ForgotPasswordModule } from './modules/forgot-password/forgot-password.module';
import { GeojsonStaticContentModule } from './modules/geojson-static-content/geojson-static-content.module';
import { KeycloakConfigService } from './modules/keycloak/keycloak-config.service';
import { KeycloakModule } from './modules/keycloak/keycloak.module';
import { LiteModule } from './modules/lite/lite.module';
import { MailModule } from './modules/mail/mail.module';
import { OfflineContentModule } from './modules/offline-content/offline-content.module';
import { OnboardingGuidelineModule } from './modules/onboarding-guidelines/guideline/onboarding-guideline.module';
import { OrderModule } from './modules/order/order.module';
import { PassConditionModule } from './modules/pass-conditions/pass-conditions/pass-condition.module';
import { PassInventoryModule } from './modules/pass-inventory/pass-inventory.module';
import { PassesModule } from './modules/passes/passes.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PointOfInterestModule } from './modules/point-of-interest/point-of-interest.module';
import { PromotionModule } from './modules/promotions/promotion.module';
import { PushNotificationModule } from './modules/push-notification/push-notification.module';
import { RegionModule } from './modules/regions/region.module';
import { ReportModule } from './modules/report/report.module';
import { RoleModule } from './modules/role/role.module';
import { StageReviewModule } from './modules/stage-review/stage-review.module';
import { StageTagModule } from './modules/stage-tag/stage-tag.module';
import { StageModule } from './modules/stage/stage.module';
import { StaticContentModule } from './modules/static-content/static-content.module';
import { StoryModule } from './modules/story/story.module';
import { UserFavouriteStagesModule } from './modules/user-favourite-stages/user-favourite-stages.module';
import { UserTrailTrackingModule } from './modules/user-trail-tracking/user-trail-tracking.module';
import { UserModule } from './modules/user/user.module';
import { KmlModule } from './worker/kml/kml.module';
import { UserQueueModule } from '@user/queue/user-queue.module';
import { AccountModule } from './modules/account/account.module';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { NoticeModule } from './modules/notice/notice.module';
/**
 * App module
 * @description This module is used to handle app requests
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      validationSchema: ConfigValidation,
      load: [AppConfig],
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: seconds(API_REQUEST_RATE_THROTTLER_TTL),
            limit: API_REQUEST_RATE_THROTTLER_LIMIT,
          },
        ],
        storage:
          process.env.NODE_ENV === 'test'
            ? null
            : new ThrottlerStorageRedisService({
                host: configService.get('REDIS_HOST'),
                port: configService.get('REDIS_PORT'),
              }),
      }),
    }),
    AuthModule,
    ScheduleModule.forRoot(),
    UserModule,
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
    }),
    KeycloakConnectModule.registerAsync({
      useExisting: KeycloakConfigService,
      imports: [KeycloakModule],
    }),
    SentryModule.forRoot({
      dsn: process.env.SENTRY_DSN,
      debug: true,
      environment: process.env.SENTRY_ENVIRONMENT,
      release: RELEASE_VERSION,
      logLevels: ['error', 'fatal', 'warn'],
      enabled:
        (SENTRY_ENVIRONMENTS as unknown as string[]).includes(process.env.SENTRY_ENVIRONMENT) &&
        process.env.SENTRY_ENVIRONMENT !== 'Local',
      attachStacktrace: true,
      autoSessionTracking: true,
      enableTracing: true,
      maxBreadcrumbs: 50,
      beforeSend: (event) => {
        // Do not send preflight request & only allowed to send 'fatal' | 'error' | 'warning' events to Sentry
        if (
          event.request?.method?.toUpperCase() === 'OPTIONS' ||
          event.level === 'log' ||
          event.level === 'info'
        ) {
          return null;
        }
        return event;
      },
      beforeSendTransaction: (event) => {
        // Do not track success status 200 || 201 || 304 && preflight requests
        if (
          (event?.transaction_info?.source === 'route' &&
            (event?.contexts?.trace?.tags['http.status_code'] === HttpStatus.OK.toString() ||
              event?.contexts?.trace?.tags['http.status_code'] ===
                HttpStatus.NOT_MODIFIED.toString() ||
              event?.contexts?.trace?.tags['http.status_code'] ===
                HttpStatus.ACCEPTED.toString())) ||
          event.request?.method?.toUpperCase() === 'OPTIONS'
        ) {
          return null;
        }

        //  Remove sensitive information sending to sentry
        if (event?.request?.data?.password) {
          delete event?.request?.data?.password;
        }
        if (event?.request?.data?.newPassword) {
          delete event?.request?.data?.newPassword;
        }

        return event;
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    FcmTokensModule,
    LocaleModule,
    OnboardingGuidelineModule,
    MailModule,
    StageModule,
    ForgotPasswordModule,
    RoleModule,
    AuthModule,
    PoliciesModule,
    PassConditionModule,
    StoryModule,
    StageReviewModule,
    UserFavouriteStagesModule,
    StaticContentModule,
    BadgeModule,
    PermissionsModule,
    PromotionModule,
    KmlModule,
    PassesModule,
    PointOfInterestModule,
    EmergencyContactModule,
    StageTagModule,
    PassInventoryModule,
    PushNotificationModule,
    OrderModule,
    GeojsonStaticContentModule,
    LiteModule,
    OfflineContentModule,
    UserTrailTrackingModule,
    AssetReportsModule,
    RegionModule,
    ReportModule,
    ExportToExcelModule,
    AccountModule,
    UserQueueModule,
    NoticeModule,
  ],

  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AppService,
  ],
})
export class AppModule {}
