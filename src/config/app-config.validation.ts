import Joi from 'joi';
//
import { CONFIG_NAMESPACES, SENTRY_ENVIRONMENTS, VALID_ENVIRONMENTS } from '@common/constants';
import { IAppConfig } from '@common/types';

/**
 * Joi configuration for validating the environment variables.
 */
export const ConfigValidation = Joi.object<IAppConfig>({
  NODE_ENV: Joi.string()
    .valid(...VALID_ENVIRONMENTS)
    .default(VALID_ENVIRONMENTS[0]),
  PORT: Joi.number().default(CONFIG_NAMESPACES.DEFAULT_PORT),
  ADMIN_URL: Joi.string().uri(),
  SENTRY_DSN: Joi.string().uri(),
  SENTRY_ENVIRONMENT: Joi.string()
    .valid(...SENTRY_ENVIRONMENTS)
    .default('Local'),
  // Database
  DATABASE_URL: Joi.string(),
  // Keycloak
  KEYCLOAK_URL: Joi.string().required(),
  KEYCLOAK_REALM: Joi.string().required(),
  KEYCLOAK_CLIENT_ID: Joi.string().required(),
  KEYCLOAK_SECRET: Joi.string().required(),
  KEYCLOAK_TOKEN_URL: Joi.string().required(),
  KEYCLOAK_USER_INFO_URL: Joi.string().required(),
  KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE: Joi.string().required(),
  KEYCLOAK_PAT_GRANT_TYPE: Joi.string().required(),
  KEYCLOAK_REDIRECT_URI: Joi.string().required(),
  KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE: Joi.string().required(),
  KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS: Joi.string().required(),

  //aws config
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_BUCKET_NAME: Joi.string().required(),

  //firebase config
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().required(),
  FIREBASE_PROJECT_ID: Joi.string().required(),

  //redis config
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.string().required(),

  //cdn configs
  CDN_URL: Joi.string().required(),

  //deeplinks
  DEEPLINK_VIEW_PASSES: Joi.string().required(),
});
