import { APPLICATION_ENVIRONMENTS, SENTRY_ENVIRONMENT } from '@common/constants';

/**
 * Uses IAppConfig interface for type-checking when accessing application related configuration schemas
 */
export interface IAppConfig {
  NODE_ENV: APPLICATION_ENVIRONMENTS;
  PORT: number;
  DATABASE_URL: string;
  ADMIN_URL: string;
  SENTRY_DSN: string;
  SENTRY_ENVIRONMENT: SENTRY_ENVIRONMENT;
  // Keycloak
  KEYCLOAK_URL: string;
  KEYCLOAK_REALM: string;
  KEYCLOAK_CLIENT_ID: string;
  KEYCLOAK_SECRET: string;
  KEYCLOAK_TOKEN_URL: string;
  KEYCLOAK_USER_INFO_URL: string;
  KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE: string;
  KEYCLOAK_PAT_GRANT_TYPE: string;
  KEYCLOAK_REDIRECT_URI: string;
  KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE: string;
  KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS: string;
  OTP_EXPIRATION_PERIOD: string;
  DOMAIN: string;
  MAIL_HOST: string;
  MAIL_HOST_USER: string;
  MAIL_HOST_PASSWORD: string;

  //aws config
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_BUCKET_NAME: string;

  //firebase config
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PROJECT_ID: string;

  //redis config
  REDIS_HOST: string;
  REDIS_PORT: string;

  //cdn configs
  CDN_URL: string;

  //deeplinks
  DEEPLINK_VIEW_PASSES: string;
}
