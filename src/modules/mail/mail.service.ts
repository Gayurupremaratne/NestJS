import { CONFIG_NAMESPACES } from '@common/constants';
import { IAppConfig } from '@common/types';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { compile } from 'handlebars';
import { readFileSync } from 'fs';
import { MailPayload } from './interfaces/mail.interface';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly mailFrom: string = 'Admin';

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport(
      {
        host: this.config.get<IAppConfig>(CONFIG_NAMESPACES.APP)['MAIL_HOST'],
        secure: true,
        auth: {
          user: this.config.get<IAppConfig>(CONFIG_NAMESPACES.APP)['MAIL_HOST_USER'],
          pass: this.config.get<IAppConfig>(CONFIG_NAMESPACES.APP)['MAIL_HOST_PASSWORD'],
        },
      },
      {
        from: `${this.mailFrom}" <mail@${
          this.config.get<IAppConfig>(CONFIG_NAMESPACES.APP)['DOMAIN']
        }>`,
        list: {
          unsubscribe: {
            url: 'https://www.test.com/',
            comment: 'unsubscribe',
          },
        },
      },
    );
  }

  async sendMail(mailOptions: nodemailer.SendMailOptions, payload: MailPayload) {
    const templateContent = readFileSync(
      __dirname + `/templates/${payload.templateName}.hbs`,
    ).toString();
    const hbTemplate = compile(templateContent);
    mailOptions.html = hbTemplate(payload.templateVars);
    const response = this.transporter.sendMail(mailOptions);
    return response;
  }
}
