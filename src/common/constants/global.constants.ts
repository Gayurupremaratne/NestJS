import { CronExpression } from '@nestjs/schedule';

/**
 * Manging all global constants
 */
export enum CONFIG_NAMESPACES {
  APP = 'APP',
  KEYCLOAK = 'KEYCLOAK',
  DEFAULT_PORT = 3000,
}
/**
 * Managing the environment variables
 */
export const VALID_ENVIRONMENTS = ['development', 'production', 'test'] as const;
/**
 * Possible application environments based on the `VALID_ENVIRONMENTS` array
 */
export type APPLICATION_ENVIRONMENTS = (typeof VALID_ENVIRONMENTS)[number];

/**
 * Sentry Environments
 */

export const SENTRY_ENVIRONMENTS = ['Local', 'Development', 'Staging', 'Production'] as const;
export type SENTRY_ENVIRONMENT = (typeof SENTRY_ENVIRONMENTS)[number];

export const PLATFORM = {
  mobile: 'MOBILE',
  web: 'WEB',
} as const;

export const RBAC_ACTIONS = {
  READ: 'read',
  MANAGE: 'manage',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export const RBAC_SUBJECTS = {
  ALL: 'all',
  USER: 'User',
  ROLE: 'Role',
  AUTH: 'Auth',
  FCM: 'Firebase Cloud Messaging',
  ONBOARDING_GIUDELINES: 'On Boarding Guidelines',
  PASS_CONDITION: 'Pass Condition',
  PASS_INVENTORY: 'Pass Inventory',
  POLICIES_AND_CONDITIONS: 'Policies And Conditions',
  TRAIL: 'Trail',
  POINT_OF_INTEREST: 'Point Of Interest',
  STAGE_TAG: 'Stage Tag',
  BADGES: 'Badges',
  NOTIFICATIONS: 'Notifications',
  PASS: 'Pass',
  PROMOTIONS: 'Promotions',
  AWARD_BADGE: 'Award Badge',
  REPORTED_IMAGES: 'Reported Images',
  TRAIL_TRACKING: 'Trail Tracking',
  STAGE_WISE_SUMMARY: 'Stage Wise Summary',
  ADMIN_PORTAL: 'Admin Portal',
  DASHBOARD_PASSES: 'Dashboard Passes',
  DASHBOARD_PASSES_CHART: 'Dashboard Passes Chart',
  DASHBOARD_CONTENT_UPLOADED: 'Dashboard Content Uploaded',
  DASHBOARD_STAGES_CLOSED: 'Dashboard Stages Closed',
  DASHBOARD_REPORTED_CONTENT: 'Dashboard Reported Content',
  CANCELLED_PASSES_REPORT: 'Cancel passes reports',
  CLOSED_STAGES_REPORT: 'Closed stages reports',
  STAGE_TRANSLATION: 'Stage Translation',
  PERMISSION: 'Permission',
  STORY: 'Story',
  NOTICE: 'Notice',
  NOTICEBOARD: 'Noticeboard',
  KML: 'kml',
};

export const RBAC_SUBJECTS_ARRAY = Object.values(RBAC_SUBJECTS);

export const EMAIL_TEMPLATES = {
  VERIFY_EMAIL: 'verify-email',
  FORGOT_PASSWORD: 'forgot-password',
  PASS_CONFIRMATION: 'pass-confirmation',
  STAGE_CLOSURE: 'stage-closure-pass-cancellation',
  ACCOUNT_DELETION: 'account-deletion',
  PASS_CANCELLATION: 'pass-cancellation',
  NOTICE_EMAIL: 'notice-email',
} as const;

export const MAIL_FROM = 'Admin';

export const STATIC_CONTENT_PATHS = {
  TRAIL_MEDIA: 'trail-media',
  STORY_MEDIA: 'story-media',
  BADGE_MEDIA: 'badge-media',
  PROFILE_MEDIA: 'profile-media',
  PROMOTION_MEDIA: 'promotion-media',
  POI_MEDIA: 'poi-media',
  KML_STAGE_MEDIA: 'kml-stage-media',
  KML_OTHER_MEDIA: 'kml-other-media',
  OTHERS: 'other-media',
};

export const GEOJSON_FILE_TYPES = {
  PROTECTED_AREAS: 'protected-areas',
  RAILWAY: 'railway',
  POI: 'poi',
  DISTRICTS: 'districts',
  POLICE_STATIONS: 'police-stations',
  GN: 'gn',
};

export const STATIC_CONTENT_TYPES = {
  STATIC_MEDIA: ['.mp4', '.mp3', '.png', '.jpeg', '.jpg', '.heic', '.m4a', '.aac', '.wav'],
};

export const CONTENT_TYPE_BY_EXTENSION = {
  '.jpg': ['image/jpeg', 'image/jpg'],
  '.jpeg': ['image/jpeg', 'image/jpg'],
  '.png': ['image/png'],
  '.heic': ['image/heic'],
  '.mp4': ['video/mp4'],
  '.mp3': ['audio/mpeg'],
  '.m4a': ['audio/m4a'],
  '.aac': ['audio/aac'],
  '.wav': ['audio/wav'],
};

export const FORGOT_PASSWORD_ACTIVE_PERIOD = 300;

export const DEFAULT_PAGE_LIMIT = 10;

export const DATE_FORMATS = {
  YYYYMMDD: 'YYYY-MM-DD',
  YYYYMMDDHHMMSS: 'YYYY-MM-DD HH:mm:ss',
};

export const QUEUES = {
  PUSH_NOTIFICATION: 'push-notification',
  KML: 'kml',
  USER_DELETE: 'user-delete',
  MAIL: 'mail',
  NOTICE: 'notice',
};

export const PASSWORD_REGEX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,50}$/;
export const LATITUDE_REGEX = /^-?([0-8]?\d+\.\d+|90\.0+)$/;
export const LONGITUDE_REGEX = /^-?((1[0-7]\d|\d?\d)\.\d+|180\.0+)$/;
export const ALPHABETS_SPACES_REGEX = /^[A-Za-z\s]+$/;

export const PASS_EXPIRY_PERIOD = 14; // days

export const PASS_AMEND_EXPIRY_PERIOD = 12; // hours
export const PASS_VALIDITY_PERIOD = 36;
export const TRAIL_COMPLETION_PERCENTAGE = 100;
export const TRAIL_START_PERCENTAGE = 0;

export const COMPLETION_STATUS = {
  COMPLETE: 'complete',
  INCOMPLETE: 'in-complete',
  ALL: 'all',
} as const;

export const USER_DELETION_DELAY_IN_DAYS = 30;
export const QUEUE_ATTEMPT_COUNT = 5;
export const QUEUE_ATTEMPT_BACKOFF = 5000;
export const USER_DELETE_TOKEN_EXPIRATION_IN_MINUTES = 5;

// api rate limiting
export const API_REQUEST_RATE_THROTTLER_TTL = 1; //seconds
export const API_REQUEST_RATE_THROTTLER_LIMIT = 15;

// api rate limiting - User Deletion
export const USER_DELETION_REQUEST_RATE_THROTTLER_TTL = 60; //seconds
export const USER_DELETION_REQUEST_RATE_THROTTLER_LIMIT = 3;

//notice
export const NOTICE_CRON_EXPRESSION = CronExpression.EVERY_30_MINUTES;
export const NOTICE_QUEUE_BATCH_SIZE = 10;
// allowed OTP attempts
export const EMAIL_CONFIRMATION_OTP_ATTEMPTS = 3; // email verification opt attempt limit
export const RESET_PASSWORD_OTP_ATTEMPTS = 3; // reset password verification opt attempt limit

//maxumum file size
export const MAX_STATIC_CONTENT_FILE_SIZE = 26214400; // 25MB
