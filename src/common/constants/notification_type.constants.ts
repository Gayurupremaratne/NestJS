/**
 * Notification type enum for notification
 */
export const NOTIFICATION_TYPE = ['EMAIL', 'NOTIFICATION'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[number];

export const NOTIFICATION_TYPE_CODE: Record<NotificationType, number> = {
  EMAIL: 0,
  NOTIFICATION: 1,
};
