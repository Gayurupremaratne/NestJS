import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Injectable()
export class AppService {
  constructor(private readonly i18n: I18nService) {}

  getHealthCheck(): string {
    return this.i18n.t('health.ok', { lang: I18nContext.current().lang });
  }
}
