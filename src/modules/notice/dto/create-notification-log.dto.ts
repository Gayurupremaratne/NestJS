import { $Enums } from '@prisma/client';

export interface CreateMailNotificationLog {
  title: string;
  body: string;
  isRead: boolean;
  noticeId: string;
  notificationType: $Enums.NOTICE_TYPE;
  status: boolean;
  userId: string;
  error?: string;
  token?: string;
}
