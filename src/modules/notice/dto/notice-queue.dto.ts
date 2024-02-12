import { NOTICE_TYPE, NoticeTranslation } from '@prisma/client';

export interface NoticeQueueDto {
  id: string;
  category?: string;
  type: NOTICE_TYPE;
  noticeTranslation: NoticeTranslation[];
  userId: string;
}
