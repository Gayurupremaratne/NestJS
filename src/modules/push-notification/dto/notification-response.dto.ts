import { NOTIFICATION_TYPE } from '@common/constants/notification_type.constants';

export class NotificationResponse {
  id: string;
  title: string;
  body: string;
  token: string;
  status: boolean;
  error: string;
  notificationType: (typeof NOTIFICATION_TYPE)[number];
  isRead: boolean;
  noticeId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  notice: NotificationNotice;
}

interface NotificationNotice {
  stage: null | {
    id: string;
  };
}
