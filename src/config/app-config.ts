import { registerAs } from '@nestjs/config';
//
import { CONFIG_NAMESPACES } from '@common/constants';
import { IAppConfig } from '@common/types';

/**
 * Uses to define independent custom configurations
 */
export const AppConfig = registerAs(
  CONFIG_NAMESPACES.APP,
  (): IAppConfig => ({
    NODE_ENV: process.env.NODE_ENV as IAppConfig['NODE_ENV'],
    PORT: +process.env.PORT || CONFIG_NAMESPACES.DEFAULT_PORT,
    ADMIN_URL: process.env.ADMIN_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT as IAppConfig['SENTRY_ENVIRONMENT'],
    // Keycloak
    KEYCLOAK_URL: process.env.KEYCLOAK_URL,
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
    KEYCLOAK_TOKEN_URL: process.env.KEYCLOAK_TOKEN_URL,
    KEYCLOAK_USER_INFO_URL: process.env.KEYCLOAK_USER_INFO_URL,
    KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE: process.env.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE,
    KEYCLOAK_PAT_GRANT_TYPE: process.env.KEYCLOAK_PAT_GRANT_TYPE,
    KEYCLOAK_REDIRECT_URI: process.env.KEYCLOAK_REDIRECT_URI,
    KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE: process.env.KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE,
    KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS:
      process.env.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS,
    // Database
    DATABASE_URL: process.env.DATABASE_URL as IAppConfig['DATABASE_URL'],
    OTP_EXPIRATION_PERIOD: process.env.OTP_EXPIRATION_PERIOD,
    DOMAIN: process.env.DOMAIN,
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_HOST_USER: process.env.MAIL_HOST_USER,
    MAIL_HOST_PASSWORD: process.env.MAIL_HOST_PASSWORD,

    //aws config
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,

    //firebase config
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,

    // redis config
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,

    //cdn configs
    CDN_URL: process.env.CDN_URL,

    //deeplinks
    DEEPLINK_VIEW_PASSES: process.env.DEEPLINK_VIEW_PASSES,
  }),
);
