import { NOTICE_TYPE, NoticeTranslation } from '@prisma/client';

export interface PendingNoticeDto {
  id: string;
  category?: string;
  type: NOTICE_TYPE;
  noticeTranslation: NoticeTranslation[];
}
